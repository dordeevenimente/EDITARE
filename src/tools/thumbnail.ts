import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput, toAbsolute } from "../lib/paths.js";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { overwrite, parseTimecode, timecode } from "../lib/schema.js";
import { defineTool } from "./types.js";

export const thumbnailTool = defineTool({
  name: "thumbnail",
  title: "Extract thumbnail / frames",
  description:
    "Capture a single frame at a given time, or extract frames at a fixed " +
    "interval. For a single frame, `output` is an image path (e.g. out.jpg). " +
    "For interval mode, `output` must contain a printf pattern (e.g. " +
    "frame_%04d.jpg).",
  inputSchema: {
    input: z.string().describe("Path to the source video."),
    output: z
      .string()
      .describe(
        "Image path for single frame, or printf pattern (e.g. frame_%04d.jpg) for interval mode.",
      ),
    at: timecode
      .optional()
      .describe("Timestamp for a single frame. Default 0 if no interval given."),
    everySeconds: z
      .number()
      .positive()
      .optional()
      .describe("Extract one frame every N seconds (interval mode)."),
    width: z
      .number()
      .positive()
      .optional()
      .describe("Scale output width in pixels (height auto, keeps aspect)."),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const everySeconds = args.everySeconds as number | undefined;

    // Interval mode uses a pattern; resolveOutput can't validate a glob, so we
    // validate the directory directly and resolve the pattern to absolute.
    let output: string;
    if (everySeconds !== undefined) {
      output = toAbsolute(args.output as string);
      const dir = dirname(output);
      if (!existsSync(dir)) throw new Error(`Output directory does not exist: ${dir}`);
    } else {
      output = resolveOutput(args.output as string, args.overwrite as boolean);
    }

    const ff = ["-y"];
    const vf: string[] = [];

    if (everySeconds !== undefined) {
      ff.push("-i", input);
      vf.push(`fps=1/${everySeconds}`);
    } else {
      const at = args.at ? parseTimecode(args.at as string) : 0;
      ff.push("-ss", String(at), "-i", input, "-frames:v", "1");
    }

    if (args.width) vf.push(`scale=${args.width}:-1`);
    if (vf.length) ff.push("-vf", vf.join(","));

    ff.push(output);
    await runFfmpeg(ff);
    return { output, mode: everySeconds !== undefined ? "interval" : "single" };
  },
});
