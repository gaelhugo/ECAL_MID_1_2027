/**
 * Génère build/icon.icns — l'icône de proce55us.
 * Une mosaïque de « pixels » (l'image webcam réduite en grille, comme le
 * processus « Raster Image ») où se détachent deux « 5 » : le ss → 55 du nom.
 * Aucune dépendance : le PNG est encodé à la main avec le zlib de Node.
 * Usage : node make-icon.js (lancé par build-mac.sh quand l'icône manque)
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILD = path.join(path.dirname(fileURLToPath(import.meta.url)), "build");
const ICONSET = path.join(BUILD, "icon.iconset");

// Le « 5 » en fonte à pixels 3×5
const GLYPH5 = ["111", "100", "111", "001", "111"];
const COLS = 9; // marge | 5 | écart | 5 | marge
const ROWS = 7; // marge | 5 lignes du glyphe | marge

// Cellules de fond : gris neutres, avec quelques cellules jaune très sombre
function dimColor(i, j) {
  let h = (i * 374761393 + j * 668265263) >>> 0;
  h = (Math.imul(h ^ (h >>> 13), 1274126177) ^ 0x9e3779b9) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  const n = h / 4294967296;
  const k = 0.8 + n * 0.4;
  if (n < 0.2) return [74 * k, 62 * k, 12 * k]; // jaune noyé
  const l = (30 + n * 26) * k; // gris neutre
  return [l, l, l];
}

function litCell(col, row) {
  if (row < 1 || row > 5) return false;
  const r = row - 1;
  if (col >= 1 && col <= 3) return GLYPH5[r][col - 1] === "1";
  if (col >= 5 && col <= 7) return GLYPH5[r][col - 5] === "1";
  return false;
}

// Couleur [r, g, b, a] du point (x, y), en coordonnées flottantes d'une icône S×S
function sample(S, x, y) {
  const rad = S * 0.2237; // coin arrondi « squircle » macOS
  const inside = (x0, y0, x1, y1, r) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  if (!inside(0, 0, S, S, rad)) return [0, 0, 0, 0];

  const t = y / S; // fond : presque noir, léger dégradé vertical
  let c = [16 - 8 * t, 16 - 8 * t, 16 - 8 * t];

  const pitch = S * 0.095;
  const cell = pitch * 0.82;
  const x0 = (S - COLS * pitch) / 2;
  const y0 = (S - ROWS * pitch) / 2;
  const i = Math.floor((x - x0) / pitch);
  const j = Math.floor((y - y0) / pitch);
  if (i >= 0 && i < COLS && j >= 0 && j < ROWS) {
    const cx0 = x0 + i * pitch + (pitch - cell) / 2;
    const cy0 = y0 + j * pitch + (pitch - cell) / 2;
    if (inside(cx0, cy0, cx0 + cell, cy0 + cell, cell * 0.3)) {
      if (litCell(i, j)) {
        const l = (y - cy0) / cell; // « 5 » : jaune vif, léger dégradé
        c = [255, 214 - 14 * l, 10];
      } else c = dimColor(i, j);
    }
  }
  return [...c, 255];
}

function render(S) {
  const rgba = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (const [dx, dy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        const [sr, sg, sb, sa] = sample(S, x + dx, y + dy);
        r += sr * sa;
        g += sg * sa;
        b += sb * sa;
        a += sa;
      }
      const o = (y * S + x) * 4; // moyenne prémultipliée : rgb / Σa, couverture = Σa / 4
      rgba[o] = a ? Math.round(r / a) : 0;
      rgba[o + 1] = a ? Math.round(g / a) : 0;
      rgba[o + 2] = a ? Math.round(b / a) : 0;
      rgba[o + 3] = Math.round(a / 4);
    }
  return rgba;
}

// --- encodage PNG minimal (RGB8A, filtre 0) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])));
  return Buffer.concat([head, Buffer.from(type, "ascii"), data, crc]);
};
const encodePNG = (S, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // profondeur 8 bits
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++)
    rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

mkdirSync(ICONSET, { recursive: true });
for (const [size, name] of [
  [16, "icon_16x16"],
  [32, "icon_16x16@2x"],
  [32, "icon_32x32"],
  [64, "icon_32x32@2x"],
  [128, "icon_128x128"],
  [256, "icon_128x128@2x"],
  [256, "icon_256x256"],
  [512, "icon_256x256@2x"],
  [512, "icon_512x512"],
  [1024, "icon_512x512@2x"],
])
  writeFileSync(
    path.join(ICONSET, `${name}.png`),
    encodePNG(size, render(size)),
  );

execFileSync("iconutil", [
  "-c",
  "icns",
  ICONSET,
  "-o",
  path.join(BUILD, "icon.icns"),
]);
console.log(`✓ ${path.relative(process.cwd(), path.join(BUILD, "icon.icns"))}`);
