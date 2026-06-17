import type { ToolDef } from "./types.js";
import { probeTool } from "./probe.js";
import { trimTool } from "./trim.js";
import { concatTool } from "./concat.js";
import { convertTool } from "./convert.js";
import { extractAudioTool } from "./extract.js";
import { thumbnailTool } from "./thumbnail.js";
import { burnSubtitlesTool } from "./subtitles.js";
import { overlayTool } from "./overlay.js";
import { autoSubtitleTool } from "./autosubtitle.js";
import { cutSilenceTool } from "./silence.js";

export const tools: ToolDef[] = [
  probeTool,
  trimTool,
  concatTool,
  convertTool,
  extractAudioTool,
  thumbnailTool,
  burnSubtitlesTool,
  overlayTool,
  autoSubtitleTool,
  cutSilenceTool,
];
