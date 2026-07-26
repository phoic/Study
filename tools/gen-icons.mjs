// Renders tools/icon-source.html to the launcher PNGs in public/icons/.
//
//   node tools/gen-icons.mjs
//
// Chromium is used as the rasterizer (it is already here for the Playwright
// checks), so the icon stays a single HTML source instead of hand-maintained
// bitmaps — edit icon-source.html, re-run, commit the PNGs.

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const src = `file://${resolve(here, "icon-source.html")}`;
const out = resolve(here, "..", "public", "icons");

const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-512-maskable.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180 },
];

// Prefer a preinstalled Chromium when the pinned Playwright build isn't
// downloaded (CI images ship one under PLAYWRIGHT_BROWSERS_PATH).
const preinstalled = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
].find((p) => existsSync(p));

const browser = await chromium.launch(preinstalled ? { executablePath: preinstalled } : {});
for (const t of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: t.size, height: t.size },
    deviceScaleFactor: 1,
  });
  await page.goto(`${src}?size=${t.size}${t.maskable ? "&maskable=1" : ""}`);
  await page.waitForSelector("html[data-ready='1']");
  await page.locator("#icon").screenshot({
    path: resolve(out, t.file),
    omitBackground: true,
  });
  await page.close();
  console.log(`✓ ${t.file} (${t.size}px${t.maskable ? ", maskable" : ""})`);
}
await browser.close();
