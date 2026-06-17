import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite, parseTimecode, timecode } from "../lib/schema.js";
import { defineTool } from "./types.js";

export const trimTool = defineTool({
  name: "trim",
  title: "Trim a clip",
  description:
    "Cut a segment from a video/audio file between a start time and either an " +
    "end time or a duration. By default copies streams without re-encoding " +
    "(fast, lossless); set reencode=true for frame-accurate cuts.",
  inputSchema: {
    input: z.string().describe("Path to the source media file."),
    output: z.string().describe("Path for the trimmed output file."),
    start: timecode.describe("Start time. Seconds or timecode."),
    end: timecode.optional().describe("End time (mutually exclusive with duration)."),
    duration: timecode
      .optional()
      .describe("Length of the segment (mutually exclusive with end)."),
    reencode: z
      .boolean()
      .default(false)
      .describe("Re-encode for frame-accurate cuts instead of stream copy."),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);
    const start = parseTimecode(args.start as string);

    if (args.end && args.duration) {
      throw new Error("Provide either end or duration, not both.");
    }
    let dur: number;
    if (args.duration) {
      dur = parseTimecode(args.duration as string);
    } else if (args.end) {
      dur = parseTimecode(args.end as string) - start;
      if (dur <= 0) throw new Error("end must be greater than start.");
    } else {
      throw new Error("Provide either end or duration.");
    }

    const ff = ["-y", "-ss", String(start), "-i", input, "-t", String(dur)];
    if (args.reencode) {
      ff.push("-c:v", "libx264", "-c:a", "aac");
    } else {
      ff.push("-c", "copy");
    }
    ff.push(output);

    await runFfmpeg(ff);
    return { output, start, duration: dur };
  },
});
