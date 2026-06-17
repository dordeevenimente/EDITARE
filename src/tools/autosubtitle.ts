import { existsSync } from "node:fs";
import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput, toAbsolute } from "../lib/paths.js";
import { overwrite } from "../lib/schema.js";
import { defineTool } from "./types.js";

function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export const autoSubtitleTool = defineTool({
  name: "auto_subtitle",
  title: "Auto-generate subtitles (whisper)",
  description:
    "Transcribe speech to subtitles using FFmpeg's built-in whisper filter. " +
    "Writes an .srt (or .json/.txt) file. Requires a whisper.cpp model file: " +
    "set the WHISPER_MODEL_PATH env var or pass `model`. Download a model, " +
    "e.g. ggml-base.bin, from https://huggingface.co/ggerganov/whisper.cpp.",
  inputSchema: {
    input: z.string().describe("Path to the media file with speech."),
    output: z
      .string()
      .describe("Path for the generated subtitle file (e.g. out.srt)."),
    model: z
      .string()
      .optional()
      .describe("Path to a whisper.cpp model .bin. Defaults to WHISPER_MODEL_PATH."),
    language: z
      .string()
      .default("auto")
      .describe('Spoken language code (e.g. "en", "ko") or "auto".'),
    format: z
      .enum(["srt", "json", "text"])
      .default("srt")
      .describe("Output transcription format."),
    overwrite,
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    const output = resolveOutput(args.output as string, args.overwrite as boolean);

    const modelPath = (args.model as string) ?? process.env.WHISPER_MODEL_PATH;
    if (!modelPath) {
      throw new Error(
        "No whisper model provided. Set WHISPER_MODEL_PATH or pass `model`. " +
          "Download e.g. ggml-base.bin from https://huggingface.co/ggerganov/whisper.cpp/tree/main.",
      );
    }
    const model = toAbsolute(modelPath);
    if (!existsSync(model)) {
      throw new Error(`Whisper model file not found: ${model}`);
    }

    const opts = [
      `model='${escapeFilterPath(model)}'`,
      `language=${args.language as string}`,
      `format=${args.format as string}`,
      `destination='${escapeFilterPath(output)}'`,
    ].join(":");

    // The whisper filter is an audio filter that side-writes the transcript to
    // `destination`. We discard the actual audio output (-f null).
    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-vn",
      "-af",
      `whisper=${opts}`,
      "-f",
      "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ]);

    return { output, model, language: args.language, format: args.format };
  },
});
