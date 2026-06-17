import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite } from "../lib/schema.js";
import { defineTool } from "./types.js";

const AUDIO_ENCODERS: Record<string, string> = {
  mp3: "libmp3lame",
  aac: "aac",
  wav: "pcm_s16le",
  flac: "flac",
  opus: "libopus",
};

export const extractAudioTool = defineTool({
  name: "extract_audio",
  title: "Extract audio",
  description:
    "Extract the audio track from a video into an audio file (mp3/aac/wav/" +
    "flac/opus). The format is chosen by the `format` field.",
  inputSchema: {
    input: z.string().describe("Path to the source video."),
    output: z.string().describe("Path for the extracted audio file."),
    format: z
      .enum(["mp3", "aac", "wav", "flac", "opus"])
      .default("mp3")
      .describe("Audio output format."),
    bitrate: z
      .string()
      .optional()
      .describe('Audio bitrate for lossy formats, e.g. "192k".'),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);
    const format = args.format as keyof typeof AUDIO_ENCODERS;

    const ff = ["-y", "-i", input, "-vn", "-c:a", AUDIO_ENCODERS[format]];
    if (args.bitrate && format !== "wav" && format !== "flac") {
      ff.push("-b:a", args.bitrate as string);
    }
    ff.push(output);

    await runFfmpeg(ff);
    return { output, format };
  },
});
