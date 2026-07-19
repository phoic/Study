// Generates the PWA PNG icons without any image dependency.
// Draws the app mark — a "study timer" ring on a warm dark tile — as raw
// RGBA pixels and encodes them with a minimal PNG writer (Node zlib).
//
//   node scripts/generate-icons.mjs
//
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const hexRgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const INK = hexRgb("#2b2a27"); // warm near-black tile
const PAPER = hexRgb("#faf9f6"); // warm off-white ring
const ACCENT = hexRgb("#3b6fe0"); // 미적분 blue-ish accent (progress arc)

// ---- minimal PNG encoder -------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- draw the mark -------------------------------------------------------
// maskable: fill the whole square (safe area handled by padding the ring).
function drawIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const tileR = size * (maskable ? 0.5 : 0.235); // corner radius for the tile
  const ringOuter = size * (maskable ? 0.3 : 0.32);
  const ringWidth = size * 0.085;
  const ringInner = ringOuter - ringWidth;
  const pad = maskable ? 0 : size * 0.07; // gutter around the tile for non-maskable
  const tile = { x0: pad, y0: pad, x1: size - pad, y1: size - pad };

  const put = (i, [r, g, b], a = 255) => {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
  };

  // rounded-rect signed distance (inside < 0)
  const insideTile = (x, y) => {
    const w = (tile.x1 - tile.x0) / 2;
    const h = (tile.y1 - tile.y0) / 2;
    const qx = Math.abs(x - cx) - (w - tileR);
    const qy = Math.abs(y - cy) - (h - tileR);
    const dx = Math.max(qx, 0);
    const dy = Math.max(qy, 0);
    return Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) - tileR;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // background: tile or transparent
      const dTile = insideTile(px, py);
      if (dTile > 1) {
        put(i, [0, 0, 0], 0);
        continue;
      }
      const tileA = Math.max(0, Math.min(1, 0.5 - dTile)) * 255;
      put(i, INK, maskable ? 255 : tileA);

      // ring (annulus) with a small opening at top-left, like the design's mark
      const dist = Math.hypot(px - cx, py - cy);
      const inRing = dist <= ringOuter && dist >= ringInner;
      if (!inRing) continue;
      const ang = Math.atan2(py - cy, px - cx); // -pi..pi
      // gap around -2.2 rad (upper-left) → open ring
      const gap = Math.abs(((ang + 2.2 + Math.PI) % (2 * Math.PI)) - Math.PI) < 0.5;
      if (gap) continue;
      // progress arc (accent) over the first ~62% sweep clockwise from top
      const sweep = (ang + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI); // 0 at top, cw
      const color = sweep < 2 * Math.PI * 0.62 ? ACCENT : PAPER;
      // antialias ring edges
      const edge = Math.min(ringOuter - dist, dist - ringInner);
      const a = Math.max(0, Math.min(1, edge)) * 255;
      // blend over current pixel
      const cur = [buf[i], buf[i + 1], buf[i + 2]];
      const t = a / 255;
      put(i, [
        Math.round(color[0] * t + cur[0] * (1 - t)),
        Math.round(color[1] * t + cur[1] * (1 - t)),
        Math.round(color[2] * t + cur[2] * (1 - t)),
      ], maskable ? 255 : Math.max(buf[i + 3], a));
    }
  }
  return encodePng(size, size, buf);
}

const targets = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-512-maskable.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, { maskable: true }],
];
for (const [name, size, opts] of targets) {
  writeFileSync(join(OUT, name), drawIcon(size, opts));
  console.log("wrote", name, size);
}
