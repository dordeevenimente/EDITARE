import { z } from "zod";

/**
 * Shared zod schema fragments and normalizers for tool inputs.
 */

/** Accepts seconds ("12.5") or a timecode ("00:01:02.5") and returns seconds. */
export function parseTimecode(value: string): number {
  const v = value.trim();
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  const parts = v.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n)) || parts.length > 3) {
    throw new Error(`Invalid timecode: ${value}`);
  }
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return seconds;
}

export const timecode = z
  .string()
  .describe('Time as seconds ("12.5") or timecode ("00:01:02.5").');

const RES_PRESETS: Record<string, string> = {
  "2160p": "3840x2160",
  "1440p": "2560x1440",
  "1080p": "1920x1080",
  "720p": "1280x720",
  "480p": "854x480",
  "360p": "640x360",
};

/** Accepts "1280x720" or a preset like "720p" and returns "WxH". */
export function parseResolution(value: string): string {
  const v = value.trim().toLowerCase();
  if (RES_PRESETS[v]) return RES_PRESETS[v];
  if (/^\d+x\d+$/.test(v)) return v;
  throw new Error(
    `Invalid resolution: ${value}. Use "WxH" (e.g. 1280x720) or a preset (e.g. 720p).`,
  );
}

export const resolution = z
  .string()
  .describe('Resolution as "WxH" (e.g. 1280x720) or preset (e.g. 720p).');

export const overwrite = z
  .boolean()
  .default(false)
  .describe("Overwrite the output file if it already exists.");
