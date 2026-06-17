import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite } from "../lib/schema.js";
import { defineTool } from "./types.js";

interface SilenceSpan {
  start: number;
  end: number;
}

/**
 * Parses silencedetect output from ffmpeg stderr into silence spans.
 * Lines look like:
 *   [silencedetect @ ..] silence_start: 3.5
 *   [silencedetect @ ..] silence_end: 5.2 | silence_duration: 1.7
 */
export function parseSilences(stderr: string): SilenceSpan[] {
  const spans: SilenceSpan[] = [];
  let pendingStart: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const startM = line.match(/silence_start:\s*([\d.]+)/);
    if (startM) {
      pendingStart = Number(startM[1]);
      continue;
    }
    const endM = line.match(/silence_end:\s*([\d.]+)/);
    if (endM && pendingStart !== null) {
      spans.push({ start: pendingStart, end: Number(endM[1]) });
      pendingStart = null;
    }
  }
  return spans;
}

/** Inverts silence spans into the keep (non-silent) segments. */
export function keepSegments(
  silences: SilenceSpan[],
  duration: number,
): SilenceSpan[] {
  const segs: SilenceSpan[] = [];
  let cursor = 0;
  for (const s of silences) {
    if (s.start > cursor) segs.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < duration) segs.push({ start: cursor, end: duration });
  return segs.filter((s) => s.end - s.start > 0.01);
}

export const cutSilenceTool = defineTool({
  name: "cut_silence",
  title: "Cut silent sections",
  description:
    "Detect and remove silent sections from a video. Runs silencedetect to " +
    "find quiet spans, then concatenates the remaining segments. Tune with " +
    "noiseDb (threshold) and minSilence (minimum silence length to cut).",
  inputSchema: {
    input: z.string().describe("Path to the source video."),
    output: z.string().describe("Path for the de-silenced output video."),
    noiseDb: z
      .number()
      .default(-30)
      .describe("Silence threshold in dB (e.g. -30). Lower = stricter."),
    minSilence: z
      .number()
      .positive()
      .default(0.5)
      .describe("Minimum silence duration (seconds) to treat as cuttable."),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);
    const noiseDb = args.noiseDb as number;
    const minSilence = args.minSilence as number;

    // Pass 1: detect silence (no output file; read from stderr).
    const detect = await runFfmpeg([
      "-i",
      input,
      "-af",
      `silencedetect=noise=${noiseDb}dB:d=${minSilence}`,
      "-f",
      "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ]);

    // Determine total duration from the detect log.
    const durM = detect.stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    const duration = durM
      ? Number(durM[1]) * 3600 + Number(durM[2]) * 60 + Number(durM[3])
      : Infinity;

    const silences = parseSilences(detect.stderr);
    const keep = keepSegments(silences, duration);

    if (keep.length === 0) {
      throw new Error("Entire input was detected as silent; nothing to keep.");
    }
    if (silences.length === 0) {
      throw new Error("No silence detected with the given threshold; nothing to cut.");
    }

    // Pass 2: build a select/aselect filtergraph that keeps the segments.
    const between = (s: SilenceSpan) =>
      `between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})`;
    const expr = keep.map(between).join("+");
    const filter =
      `[0:v]select='${expr}',setpts=N/FRAME_RATE/TB[v];` +
      `[0:a]aselect='${expr}',asetpts=N/SR/TB[a]`;

    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      output,
    ]);

    return {
      output,
      removedSilences: silences.length,
      keptSegments: keep.length,
    };
  },
});
