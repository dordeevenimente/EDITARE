import { chromium } from 'playwright-core';
import path from 'node:path';

const [,, src, out, wArg, hArg] = process.argv;
const W = Number(wArg || 1080), H = Number(hArg || 1440);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.goto('file://' + path.resolve(src));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
