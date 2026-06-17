import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite, parseResolution, resolution } from "../lib/schema.js";
import { defineTool } from "./types.js";

const VIDEO_ENCODERS: Record<string, string> = {
  h264: "libx264",
  hevc: "libx265",
  h265: "libx265",
  vp9: "libvpx-vp9",
  av1: "libsvtav1",
  "h264-nvenc": "h264_nvenc",
  "hevc-nvenc": "hevc_nvenc",
  "av1-nvenc": "av1_nvenc",
};

export const convertTool = defineTool({
  name: "convert",
  title: "Convert / transcode",
  description:
    "Transcode a video: change container format, codec, resolution, fps, or " +
    "bitrate. Supports NVENC hardware encoders (e.g. codec='h264-nvenc'). " +
    "The output container is inferred from the output file extension.",
  inputSchema: {
    input: z.string().describe("Path to the source media file."),
    output: z.string().describe("Path for the converted output (extension sets container)."),
    codec: z
      .enum([
        "h264",
        "hevc",
        "h265",
        "vp9",
        "av1",
        "h264-nvenc",
        "hevc-nvenc",
        "av1-nvenc",
      ])
      .optional()
      .describe("Target video codec. Omit to keep the source codec where possible."),
    resolution: resolution.optional(),
    fps: z.number().positive().optional().describe("Target frame rate."),
    videoBitrate: z
      .string()
      .optional()
      .describe('Target video bitrate, e.g. "4M" or "800k".'),
    crf: z
      .number()
      .min(0)
      .max(63)
      .optional()
      .describe("Quality (lower = better) for CRF-capable encoders. Ignored if videoBitrate set."),
    audioBitrate: z
      .string()
      .optional()
      .describe('Target audio bitrate, e.g. "192k".'),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);

    const ff = ["-y", "-i", input];

    const vf: string[] = [];
    if (args.resolution) {
      const res = parseResolution(args.resolution as string);
      vf.push(`scale=${res.replace("x", ":")}`);
    }
    if (vf.length) ff.push("-vf", vf.join(","));

    if (args.fps) ff.push("-r", String(args.fps));

    if (args.codec) {
      ff.push("-c:v", VIDEO_ENCODERS[args.codec as string]);
    }

    if (args.videoBitrate) {
      ff.push("-b:v", args.videoBitrate as string);
    } else if (args.crf !== undefined) {
      ff.push("-crf", String(args.crf));
    }

    ff.push("-c:a", "aac");
    if (args.audioBitrate) ff.push("-b:a", args.audioBitrate as string);

    ff.push(output);

    await runFfmpeg(ff);
    return { output };
  },
});
