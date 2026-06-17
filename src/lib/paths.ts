import { accessSync, constants, existsSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

/**
 * Input/output path policy.
 *
 * - Relative paths are resolved against the server's working directory
 *   (or FFMPEG_MCP_WORKDIR if set).
 * - Inputs must exist and be readable.
 * - Outputs must have an existing, writable parent directory, and may not
 *   overwrite an existing file unless `overwrite` is true.
 */

function baseDir(): string {
  return process.env.FFMPEG_MCP_WORKDIR
    ? resolve(process.env.FFMPEG_MCP_WORKDIR)
    : process.cwd();
}

export function toAbsolute(p: string): string {
  return isAbsolute(p) ? p : resolve(baseDir(), p);
}

export function resolveInput(p: string): string {
  const abs = toAbsolute(p);
  if (!existsSync(abs)) {
    throw new Error(`Input file does not exist: ${abs}`);
  }
  const st = statSync(abs);
  if (!st.isFile()) {
    throw new Error(`Input path is not a file: ${abs}`);
  }
  try {
    accessSync(abs, constants.R_OK);
  } catch {
    throw new Error(`Input file is not readable: ${abs}`);
  }
  return abs;
}

export function resolveOutput(p: string, overwrite = false): string {
  const abs = toAbsolute(p);
  const dir = dirname(abs);
  if (!existsSync(dir)) {
    throw new Error(`Output directory does not exist: ${dir}`);
  }
  try {
    accessSync(dir, constants.W_OK);
  } catch {
    throw new Error(`Output directory is not writable: ${dir}`);
  }
  if (existsSync(abs) && !overwrite) {
    throw new Error(
      `Output file already exists: ${abs}. Pass overwrite=true to replace it.`,
    );
  }
  return abs;
}
