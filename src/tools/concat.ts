import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { runFfmpeg } from "../ffmpeg/runner.js";
import { resolveInput, resolveOutput } from "../lib/paths.js";
import { overwrite } from "../lib/schema.js";
import { defineTool } from "./types.js";

export const concatTool = defineTool({
  name: "concat",
  title: "Concatenate clips",
  description:
    "Join multiple clips end-to-end into one file. Use mode='copy' (default) " +
    "when all inputs share the same codec/resolution (fast, lossless); use " +
    "mode='reencode' to normalize mismatched inputs.",
  inputSchema: {
    inputs: z
      .array(z.string())
      .min(2)
      .describe("Paths of the clips to join, in order."),
    output: z.string().describe("Path for the joined output file."),
    mode: z
      .enum(["copy", "reencode"])
      .default("copy")
      .describe("copy = stream copy (same codecs); reencode = normalize."),
    overwrite,
  },
  handler: async (args) => {
    const inputs = (args.inputs as string[]).map((p) => resolveInput(p));
    const output = resolveOutput(args.output as string, args.overwrite as boolean);
    const mode = args.mode as "copy" | "reencode";

    if (mode === "copy") {
      // concat demuxer: requires a list file with absolute paths.
      const listPath = join(
        tmpdir(),
        `ffmpeg-mcp-concat-${Date.now()}.txt`,
      );
      const body = inputs
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join("\n");
      await writeFile(listPath, body, "utf8");
      try {
        await runFfmpeg([
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          listPath,
          "-c",
          "copy",
          output,
        ]);
      } finally {
        await unlink(listPath).catch(() => {});
      }
    } else {
      // concat filter: re-encode, normalizing timebases/resolutions.
      const ff: string[] = ["-y"];
      for (const p of inputs) ff.push("-i", p);
      const n = inputs.length;
      const streams = inputs.map((_, i) => `[${i}:v:0][${i}:a:0]`).join("");
      ff.push(
        "-filter_complex",
        `${streams}concat=n=${n}:v=1:a=1[outv][outa]`,
        "-map",
        "[outv]",
        "-map",
        "[outa]",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        output,
      );
      await runFfmpeg(ff);
    }

    return { output, inputs, mode };
  },
});
