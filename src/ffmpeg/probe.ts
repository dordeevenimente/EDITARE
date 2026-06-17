import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getFfprobePath } from "./locate.js";

const execFileAsync = promisify(execFile);

export interface StreamInfo {
  index: number;
  type: string; // codec_type: video | audio | subtitle | data
  codec: string | null;
  width?: number;
  height?: number;
  fps?: number | null;
  channels?: number;
  sampleRate?: number | null;
  language?: string | null;
}

export interface ProbeResult {
  path: string;
  format: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  bitRate: number | null;
  streams: StreamInfo[];
}

function parseFps(rate: string | undefined): number | null {
  if (!rate || rate === "0/0") return null;
  const [num, den] = rate.split("/").map(Number);
  if (!den) return null;
  return Math.round((num / den) * 1000) / 1000;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Runs ffprobe and returns structured metadata. Uses JSON output for reliable
 * parsing rather than scraping human-readable text.
 */
export async function probe(inputPath: string): Promise<ProbeResult> {
  const bin = getFfprobePath();
  const args = [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    inputPath,
  ];

  const { stdout } = await execFileAsync(bin, args, {
    maxBuffer: 16 * 1024 * 1024,
  });

  const data = JSON.parse(stdout) as {
    format?: Record<string, unknown>;
    streams?: Array<Record<string, unknown>>;
  };

  const format = data.format ?? {};
  const streams = (data.streams ?? []).map((s): StreamInfo => {
    const tags = (s.tags ?? {}) as Record<string, unknown>;
    return {
      index: Number(s.index ?? 0),
      type: String(s.codec_type ?? "unknown"),
      codec: (s.codec_name as string) ?? null,
      width: s.width !== undefined ? Number(s.width) : undefined,
      height: s.height !== undefined ? Number(s.height) : undefined,
      fps:
        s.codec_type === "video"
          ? parseFps(s.r_frame_rate as string | undefined)
          : undefined,
      channels: s.channels !== undefined ? Number(s.channels) : undefined,
      sampleRate:
        s.codec_type === "audio"
          ? num(s.sample_rate)
          : undefined,
      language: (tags.language as string) ?? null,
    };
  });

  return {
    path: inputPath,
    format: (format.format_name as string) ?? null,
    durationSeconds: num(format.duration),
    sizeBytes: num(format.size),
    bitRate: num(format.bit_rate),
    streams,
  };
}
