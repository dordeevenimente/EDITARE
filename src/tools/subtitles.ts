import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite } from "../lib/schema.js";
import { defineTool } from "./types.js";

/**
 * Escapes a path for use inside an ffmpeg filtergraph value.
 * On Windows, drive-letter colons and backslashes must be escaped so the
 * filtergraph parser does not treat them as option separators.
 */
function escapeFilterPath(p: string): string {
  return p
    .replace(/\\/g, "/") // normalize separators
    .replace(/:/g, "\\:") // escape drive-letter colon
    .replace(/'/g, "\\'");
}

export const burnSubtitlesTool = defineTool({
  name: "burn_subtitles",
  title: "Burn subtitles",
  description:
    "Render an .srt or .ass subtitle file permanently onto the video (hard " +
    "subs). Use force_style for SRT to tweak font/size/color (libass syntax, " +
    'e.g. "FontName=Arial,FontSize=24").',
  inputSchema: {
    input: z.string().describe("Path to the source video."),
    subtitles: z.string().describe("Path to the .srt or .ass subtitle file."),
    output: z.string().describe("Path for the subtitled output video."),
    forceStyle: z
      .string()
      .optional()
      .describe('libass style overrides for SRT, e.g. "FontSize=24,PrimaryColour=&H00FFFF&".'),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const subs = resolveInput(args.subtitles as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);

    const isAss = /\.ass$/i.test(subs);
    let filter: string;
    if (isAss) {
      filter = `ass='${escapeFilterPath(subs)}'`;
    } else {
      filter = `subtitles='${escapeFilterPath(subs)}'`;
      if (args.forceStyle) {
        filter += `:force_style='${(args.forceStyle as string).replace(/'/g, "\\'")}'`;
      }
    }

    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-vf",
      filter,
      "-c:a",
      "copy",
      output,
    ]);
    return { output };
  },
});
