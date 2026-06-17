import { describe, expect, it } from "vitest";
import { parseTimecode, parseResolution } from "../src/lib/schema.js";
import { lastMeaningfulLine } from "../src/ffmpeg/runner.js";
import { parseSilences, keepSegments } from "../src/tools/silence.js";

describe("parseTimecode", () => {
  it("parses plain seconds", () => {
    expect(parseTimecode("12.5")).toBe(12.5);
  });
  it("parses mm:ss", () => {
    expect(parseTimecode("01:30")).toBe(90);
  });
  it("parses hh:mm:ss.ms", () => {
    expect(parseTimecode("00:01:02.5")).toBe(62.5);
  });
  it("rejects garbage", () => {
    expect(() => parseTimecode("abc")).toThrow();
  });
});

describe("parseResolution", () => {
  it("expands presets", () => {
    expect(parseResolution("720p")).toBe("1280x720");
    expect(parseResolution("1080p")).toBe("1920x1080");
  });
  it("passes through WxH", () => {
    expect(parseResolution("640x480")).toBe("640x480");
  });
  it("rejects invalid", () => {
    expect(() => parseResolution("huge")).toThrow();
  });
});

describe("lastMeaningfulLine", () => {
  it("returns the last non-empty line", () => {
    expect(lastMeaningfulLine("foo\n\nbar baz\n\n")).toBe("bar baz");
  });
});

describe("silence parsing", () => {
  const log = [
    "[silencedetect @ 0x1] silence_start: 2.0",
    "[silencedetect @ 0x1] silence_end: 4.0 | silence_duration: 2.0",
    "[silencedetect @ 0x1] silence_start: 7.0",
    "[silencedetect @ 0x1] silence_end: 8.0 | silence_duration: 1.0",
  ].join("\n");

  it("parses silence spans", () => {
    expect(parseSilences(log)).toEqual([
      { start: 2, end: 4 },
      { start: 7, end: 8 },
    ]);
  });

  it("inverts to keep segments", () => {
    const keep = keepSegments(parseSilences(log), 10);
    expect(keep).toEqual([
      { start: 0, end: 2 },
      { start: 4, end: 7 },
      { start: 8, end: 10 },
    ]);
  });
});
