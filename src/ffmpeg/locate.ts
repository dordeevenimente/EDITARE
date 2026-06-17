import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Resolves the path to an ffmpeg-family binary.
 *
 * Resolution order:
 *   1. Explicit env override (FFMPEG_PATH / FFPROBE_PATH).
 *   2. Bare name on PATH (verified by invoking `-version`).
 *
 * Throws a user-friendly error when the binary cannot be found, so the MCP
 * client surfaces actionable guidance instead of an opaque ENOENT.
 */

let ffmpegCache: string | undefined;
let ffprobeCache: string | undefined;

function verify(bin: string): boolean {
  try {
    execFileSync(bin, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function resolve(
  name: "ffmpeg" | "ffprobe",
  envValue: string | undefined,
): string {
  if (envValue) {
    if (!existsSync(envValue)) {
      throw new Error(
        `${name} path from env does not exist: ${envValue}`,
      );
    }
    if (!verify(envValue)) {
      throw new Error(
        `${name} path from env is not a working ${name} binary: ${envValue}`,
      );
    }
    return envValue;
  }

  if (verify(name)) return name;

  throw new Error(
    `Could not find "${name}" on your PATH. Install FFmpeg (https://ffmpeg.org/download.html) ` +
      `or set the ${name.toUpperCase()}_PATH environment variable to the full path of the binary.`,
  );
}

export function getFfmpegPath(): string {
  if (!ffmpegCache) {
    ffmpegCache = resolve("ffmpeg", process.env.FFMPEG_PATH);
  }
  return ffmpegCache;
}

export function getFfprobePath(): string {
  if (!ffprobeCache) {
    ffprobeCache = resolve("ffprobe", process.env.FFPROBE_PATH);
  }
  return ffprobeCache;
}
