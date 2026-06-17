#!/usr/bin/env node
// Downloads a whisper.cpp ggml model into ./models for the auto_subtitle tool.
// Usage: npm run download-model [-- <model-name>]   (default: base)
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsDir = join(root, "models");

const name = (process.argv[2] || "base").replace(/^ggml-|\.bin$/g, "");
const file = `ggml-${name}.bin`;
const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${file}?download=true`;
const dest = join(modelsDir, file);

await mkdir(modelsDir, { recursive: true });

try {
  await stat(dest);
  console.log(`Model already exists: ${dest}`);
  process.exit(0);
} catch {
  // not present — download
}

console.log(`Downloading ${file} ...`);
const res = await fetch(url);
if (!res.ok || !res.body) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}

const total = Number(res.headers.get("content-length")) || 0;
let received = 0;
const out = createWriteStream(dest);
for await (const chunk of res.body) {
  received += chunk.length;
  out.write(chunk);
  if (total) {
    const pct = ((received / total) * 100).toFixed(0);
    process.stdout.write(`\r  ${pct}% (${(received / 1e6).toFixed(1)} MB)`);
  }
}
out.end();
process.stdout.write("\n");
console.log(`Saved to ${dest}`);
console.log(`Set WHISPER_MODEL_PATH=${dest} (or pass model=... to auto_subtitle).`);
