import { spawn } from "node:child_process";
import { getFfmpegPath } from "./locate.js";

export interface RunResult {
  /** Combined stderr text (ffmpeg writes its log to stderr). */
  stderr: string;
  /** stdout text (used when a tool reads probe-style data from pipe:1). */
  stdout: string;
}

export interface RunOptions {
  /** Hard kill the process after this many milliseconds. Default 10 minutes. */
  timeoutMs?: number;
  /** Optional callback invoked with the latest progress time in seconds. */
  onProgress?: (outTimeSeconds: number) => void;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Extracts the last meaningful (non-empty) line from ffmpeg stderr so failures
 * surface a concise reason rather than the entire verbose log.
 */
export function lastMeaningfulLine(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "ffmpeg failed with no output";
}

function parseProgressTime(chunk: string): number | undefined {
  // `-progress pipe:1` emits `out_time_us=NNN` (microseconds) periodically.
  const matches = [...chunk.matchAll(/out_time_us=(\d+)/g)];
  if (!matches.length) return undefined;
  const us = Number(matches[matches.length - 1][1]);
  return Number.isFinite(us) ? us / 1_000_000 : undefined;
}

/**
 * Runs ffmpeg with the given argument array. Arguments are always passed as an
 * array (never a shell string), so user-supplied paths cannot inject commands.
 *
 * Callers that want progress should include `-progress pipe:1 -nostats` in args.
 */
export function runFfmpeg(
  args: string[],
  options: RunOptions = {},
): Promise<RunResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, onProgress } = options;
  const bin = getFfmpegPath();

  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d: Buffer) => {
      const text = d.toString();
      stdout += text;
      if (onProgress) {
        const t = parseProgressTime(text);
        if (t !== undefined) onProgress(t);
      }
    });

    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`ffmpeg timed out after ${timeoutMs} ms`));
        return;
      }
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `ffmpeg exited with code ${code}: ${lastMeaningfulLine(stderr)}`,
          ),
        );
      }
    });
  });
}
