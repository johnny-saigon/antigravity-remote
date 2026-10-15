import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

export const ANTIGRAVITY_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" fill="none">
  <defs>
    <linearGradient id="ag-prism" x1="24" y1="20" x2="232" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="50%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
    <linearGradient id="ag-orbit" x1="16" y1="148" x2="240" y2="108" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#38BDF8" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#4F46E5" stop-opacity="0.25" />
    </linearGradient>
    <radialGradient id="ag-glow" cx="50%" cy="38%" r="55%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.32" />
      <stop offset="55%" stop-color="#4F46E5" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0" />
    </radialGradient>
    <filter id="ag-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>
  <!-- Ambient Zero-G Field -->
  <circle cx="128" cy="120" r="104" fill="url(#ag-glow)" />
  <!-- Back Orbital Arc -->
  <path d="M 30 146 A 102 34 0 0 1 226 110" stroke="url(#ag-orbit)" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="6 8" opacity="0.45" />
  <!-- Floating Delta-Prism "A" Main Wing -->
  <path d="M 128 28 L 210 204 L 171 204 L 128 108 L 85 204 L 46 204 Z" fill="url(#ag-prism)" />
  <!-- Inner Levitating Prism Core & Crossbar Bridge -->
  <path d="M 128 128 L 154 184 L 102 184 Z" fill="url(#ag-prism)" opacity="0.88" />
  <!-- Specular Top Highlight -->
  <path d="M 128 28 L 168 114 L 128 96 L 88 114 Z" fill="#FFFFFF" opacity="0.18" />
  <!-- Front Weightless Orbital Ring -->
  <path d="M 226 110 A 102 34 -12 0 1 30 146" stroke="url(#ag-orbit)" stroke-width="7" stroke-linecap="round" />
  <!-- Orbital Satellite Nodes -->
  <circle cx="128" cy="18" r="5" fill="#38BDF8" />
  <circle cx="218" cy="116" r="4.5" fill="#38BDF8" />
  <circle cx="38" cy="142" r="4" fill="#7C3AED" />
</svg>`;

export const ANTIGRAVITY_APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <rect width="512" height="512" rx="112" fill="#07080C" />
  <g transform="translate(32, 32) scale(1.75)">
    ${ANTIGRAVITY_LOGO_SVG.replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>
</svg>`;

// Precomputed CRC32 table for valid PNG chunk checksums
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function sign(p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number): number {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}

function pointInTriangle(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): boolean {
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function prismGradient(nx: number, ny: number): [number, number, number] {
  // 135deg gradient from #7C3AED (124, 58, 237) -> #4F46E5 (79, 70, 229) -> #38BDF8 (56, 189, 248)
  const t = Math.max(0, Math.min(1, (nx + ny - 0.35) / 1.3));
  if (t < 0.5) {
    const u = t * 2;
    return [lerp(124, 79, u), lerp(58, 70, u), lerp(237, 229, u)];
  } else {
    const u = (t - 0.5) * 2;
    return [lerp(79, 56, u), lerp(70, 189, u), lerp(229, 248, u)];
  }
}

function sampleAntigravityIcon(nx: number, ny: number): [number, number, number, number] {
  // Base Deep Void Obsidian (#07080C -> 7, 8, 12)
  let r = 7;
  let g = 8;
  let b = 12;

  // Radial ambient top glow
  const dxGlow = nx - 0.5;
  const dyGlow = ny - 0.38;
  const distGlow = Math.sqrt(dxGlow * dxGlow + dyGlow * dyGlow);
  if (distGlow < 0.55) {
    const glowFactor = Math.pow(1 - distGlow / 0.55, 2) * 0.28;
    const [gr, gg, gb] = prismGradient(nx, ny);
    r = lerp(r, gr, glowFactor);
    g = lerp(g, gg, glowFactor);
    b = lerp(b, gb, glowFactor);
  }

  // Subtle Zero-G Glass border ring at inset 0.06
  const bx = Math.abs(nx - 0.5);
  const by = Math.abs(ny - 0.5);
  const maxB = Math.max(bx, by);
  if (maxB > 0.43 && maxB < 0.442) {
    r = lerp(r, 56, 0.25);
    g = lerp(g, 189, 0.25);
    b = lerp(b, 248, 0.25);
  }

  // Tilted Orbital Ellipse around center (0.5, 0.54), rx=0.36, ry=0.115, tilt=-12 deg
  const cosA = Math.cos(0.21);
  const sinA = Math.sin(0.21);
  const ox = nx - 0.5;
  const oy = ny - 0.54;
  const rx = ox * cosA - oy * sinA;
  const ry = ox * sinA + oy * cosA;
  const ellipseDist = Math.sqrt((rx / 0.37) ** 2 + (ry / 0.115) ** 2);

  // Back orbital arc (ry < 0)
  if (ry < 0 && Math.abs(ellipseDist - 1.0) < 0.032) {
    const alpha = (1 - Math.abs(ellipseDist - 1.0) / 0.032) * 0.42;
    r = lerp(r, 124, alpha);
    g = lerp(g, 58, alpha);
    b = lerp(b, 237, alpha);
  }

  // Floating Delta-Prism "A" geometry:
  // Outer triangle: (0.50, 0.15), (0.80, 0.79), (0.20, 0.79)
  // Inner cutout 1 (upper): (0.50, 0.42), (0.64, 0.79), (0.36, 0.79)
  // Inner core delta (filled): (0.50, 0.50), (0.59, 0.72), (0.41, 0.72)
  const inOuter = pointInTriangle(nx, ny, 0.5, 0.15, 0.8, 0.79, 0.2, 0.79);
  const inCutout = pointInTriangle(nx, ny, 0.5, 0.43, 0.655, 0.8, 0.345, 0.8);
  const inCore = pointInTriangle(nx, ny, 0.5, 0.51, 0.595, 0.725, 0.405, 0.725);

  if ((inOuter && !inCutout) || inCore) {
    const [pr, pg, pb] = prismGradient(nx, ny);
    r = pr;
    g = pg;
    b = pb;

    // Specular crown highlight near apex
    if (ny < 0.42) {
      const spec = Math.max(0, (0.42 - ny) / 0.27) * 0.24;
      r = lerp(r, 255, spec);
      g = lerp(g, 255, spec);
      b = lerp(b, 255, spec);
    }
  }

  // Front orbital arc (ry >= 0) passes OVER the prism
  if (ry >= -0.01 && Math.abs(ellipseDist - 1.0) < 0.042) {
    const alpha = Math.pow(1 - Math.abs(ellipseDist - 1.0) / 0.042, 0.7) * 0.95;
    const orbitColorR = lerp(124, 56, (nx - 0.15) / 0.7);
    const orbitColorG = lerp(58, 189, (nx - 0.15) / 0.7);
    const orbitColorB = lerp(237, 248, (nx - 0.15) / 0.7);
    r = lerp(r, orbitColorR, alpha);
    g = lerp(g, orbitColorG, alpha);
    b = lerp(b, orbitColorB, alpha);
  }

  // Apex levitating cyan orb at (0.5, 0.105)
  const apexDist = Math.hypot(nx - 0.5, ny - 0.105);
  if (apexDist < 0.022) {
    const a = 1 - apexDist / 0.022;
    r = lerp(r, 56, a);
    g = lerp(g, 189, a);
    b = lerp(b, 248, a);
  }

  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

export function generateAntigravityPng(size: number): Buffer {
  // 2x2 Supersampling Anti-Aliasing (SSAA) for crisp geometric edges on Retina iOS Home Screen
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  const subOffsets = [0.25, 0.75];

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)
    for (let x = 0; x < size; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      for (const sy of subOffsets) {
        for (const sx of subOffsets) {
          const [r, g, b] = sampleAntigravityIcon((x + sx) / size, (y + sy) / size);
          rSum += r;
          gSum += g;
          bSum += b;
        }
      }
      const pxOffset = rowStart + 1 + x * 4;
      rawData[pxOffset] = rSum >> 2;
      rawData[pxOffset + 1] = gSum >> 2;
      rawData[pxOffset + 2] = bSum >> 2;
      rawData[pxOffset + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(rawData, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function ensureBrandingAssets(publicDir: string): void {
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), ANTIGRAVITY_LOGO_SVG, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), ANTIGRAVITY_LOGO_SVG, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateAntigravityPng(180));
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateAntigravityPng(192));
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateAntigravityPng(512));
}
