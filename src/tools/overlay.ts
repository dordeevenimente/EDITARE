import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite } from "../lib/schema.js";
import { defineTool } from "./types.js";

const POSITIONS: Record<string, string> = {
  "top-left": "10:10",
  "top-right": "main_w-overlay_w-10:10",
  "bottom-left": "10:main_h-overlay_h-10",
  "bottom-right": "main_w-overlay_w-10:main_h-overlay_h-10",
  center: "(main_w-overlay_w)/2:(main_h-overlay_h)/2",
};

export const overlayTool = defineTool({
  name: "overlay",
  title: "Overlay image / video",
  description:
    "Composite a watermark image or a picture-in-picture video on top of the " +
    "base video. Choose a corner/center position, optional scale (as a " +
    "fraction of base width), and opacity for images.",
  inputSchema: {
    input: z.string().describe("Path to the base video."),
    overlayPath: z.string().describe("Path to the overlay image or video."),
    output: z.string().describe("Path for the composited output video."),
    position: z
      .enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"])
      .default("bottom-right")
      .describe("Where to place the overlay."),
    scale: z
      .number()
      .positive()
      .max(1)
      .optional()
      .describe("Overlay width as a fraction of the base video width (0-1)."),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Overlay opacity 0-1 (applies to image overlays)."),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const overlayPath = resolveInput(args.overlayPath as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);
    const pos = POSITIONS[(args.position as string) ?? "bottom-right"];

    // Build the overlay-prep chain: [1:v] -> optional scale -> optional alpha.
    const prep: string[] = [];
    if (args.scale) {
      prep.push(`scale=iw*${args.scale}:-1`);
    }
    if (args.opacity !== undefined) {
      prep.push(`format=rgba,colorchannelmixer=aa=${args.opacity}`);
    }

    let filter: string;
    if (prep.length) {
      filter = `[1:v]${prep.join(",")}[ov];[0:v][ov]overlay=${pos}`;
    } else {
      filter = `[0:v][1:v]overlay=${pos}`;
    }

    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-i",
      overlayPath,
      "-filter_complex",
      filter,
      "-c:a",
      "copy",
      output,
    ]);
    return { output, position: args.position };
  },
});
