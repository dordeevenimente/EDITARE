import { z } from "zod";
import { probe } from "../ffmpeg/probe.js";
import { resolveInput } from "../lib/paths.js";
import { defineTool } from "./types.js";

export const probeTool = defineTool({
  name: "probe",
  title: "Probe media file",
  description:
    "Inspect a video/audio file with ffprobe. Returns duration, format, " +
    "bitrate, size, and a list of streams (codec, resolution, fps, channels).",
  inputSchema: {
    input: z.string().describe("Path to the media file to inspect."),
  },
  handler: async (args) => {
    const input = resolveInput(args.input as string);
    return probe(input);
  },
});
