const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.slice(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function makePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0;
    rgbaBuffer.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function scaleImage(srcBuf, srcW, srcH, dstW, dstH) {
  const dstBuf = Buffer.alloc(dstW * dstH * 4, 0);
  const xRatio = (srcW - 1) / Math.max(1, dstW - 1);
  const yRatio = (srcH - 1) / Math.max(1, dstH - 1);

  for (let dy = 0; dy < dstH; dy++) {
    const sy = dy * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(srcH - 1, y0 + 1);
    const yLerp = sy - y0;

    for (let dx = 0; dx < dstW; dx++) {
      const sx = dx * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const xLerp = sx - x0;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      const dstIdx = (dy * dstW + dx) * 4;

      for (let c = 0; c < 4; c++) {
        const top = srcBuf[idx00 + c] * (1 - xLerp) + srcBuf[idx10 + c] * xLerp;
        const bottom = srcBuf[idx01 + c] * (1 - xLerp) + srcBuf[idx11 + c] * xLerp;
        dstBuf[dstIdx + c] = Math.round(top * (1 - yLerp) + bottom * yLerp);
      }
    }
  }
  return dstBuf;
}

function makeIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(count * 16);
  let offset = 6 + count * 16;

  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i].buffer;
    const w = pngBuffers[i].width;
    const h = pngBuffers[i].height;
    const entryOffset = i * 16;

    entries[entryOffset] = w >= 256 ? 0 : w;
    entries[entryOffset + 1] = h >= 256 ? 0 : h;
    entries[entryOffset + 2] = 0;
    entries[entryOffset + 3] = 0;
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(png.length, entryOffset + 8);
    entries.writeUInt32LE(offset, entryOffset + 12);

    offset += png.length;
  }

  return Buffer.concat([header, entries, ...pngBuffers.map(p => p.buffer)]);
}

// 1. Read original raw file
const buf = fs.readFileSync('public/logo-imbs-left.png');
let pos = 8;
let idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') idat.push(buf.slice(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat));
const srcW = 110;
const srcH = 55;
const stride = 1 + srcW * 4;

// 2. Extract emblem (rows 0 to 20, columns 20 to 89)
const emblemMinX = 20;
const emblemMaxX = 89;
const emblemW = emblemMaxX - emblemMinX + 1; // 70
const emblemH = 21; // rows 0 to 20

const emblemRgba = Buffer.alloc(emblemW * emblemH * 4, 0);

for (let y = 0; y < emblemH; y++) {
  for (let x = 0; x < emblemW; x++) {
    const srcX = emblemMinX + x;
    const srcY = y;
    const srcIdx = srcY * stride + 1 + srcX * 4;
    const destIdx = (y * emblemW + x) * 4;

    const r = raw[srcIdx];
    const g = raw[srcIdx + 1];
    const b = raw[srcIdx + 2];
    const avg = (r + g + b) / 3;

    // Background threshold
    if (r > 240 && g > 240 && b > 240) {
      emblemRgba[destIdx + 3] = 0; // Transparent
    } else if (avg > 210) {
      // Smooth anti-aliased edge
      const alpha = Math.max(0, Math.min(255, Math.round(255 * (1 - (avg - 210) / 35))));
      emblemRgba[destIdx] = r;
      emblemRgba[destIdx + 1] = g;
      emblemRgba[destIdx + 2] = b;
      emblemRgba[destIdx + 3] = alpha;
    } else {
      // Check if it's the blue wing color
      if (b > r + 30 && b > 60) {
        // Boost blue vibrancy so it has perfect contrast against dark browser tabs
        // Make it royal sapphire blue: R: 37, G: 99, B: 235 with light highlights
        const blueBoost = Math.min(255, b + 50);
        emblemRgba[destIdx] = Math.max(25, Math.min(60, r + 20));
        emblemRgba[destIdx + 1] = Math.max(80, Math.min(130, g + 60));
        emblemRgba[destIdx + 2] = Math.max(180, blueBoost);
        emblemRgba[destIdx + 3] = 255;
      } else if (r > 180 && g > 130 && b < 100) {
        // Golden core / crescent - keep warm golden amber
        emblemRgba[destIdx] = 245;
        emblemRgba[destIdx + 1] = 166;
        emblemRgba[destIdx + 2] = 35;
        emblemRgba[destIdx + 3] = 255;
      } else {
        emblemRgba[destIdx] = r;
        emblemRgba[destIdx + 1] = g;
        emblemRgba[destIdx + 2] = b;
        emblemRgba[destIdx + 3] = 255;
      }
    }
  }
}

// 3. Place emblem centered squarely into a high-res 128x128 square transparent canvas
function createSquareFavicon(size) {
  const canvas = Buffer.alloc(size * size * 4, 0); // 100% transparent background

  // We want the emblem to fit comfortably within the square canvas (with 10-15% padding)
  const targetW = Math.round(size * 0.88);
  const targetH = Math.round(targetW * (emblemH / emblemW));
  
  const scaledEmblem = scaleImage(emblemRgba, emblemW, emblemH, targetW, targetH);
  
  const startX = Math.round((size - targetW) / 2);
  const startY = Math.round((size - targetH) / 2);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcIdx = (y * targetW + x) * 4;
      const dstIdx = ((startY + y) * size + (startX + x)) * 4;

      canvas[dstIdx] = scaledEmblem[srcIdx];
      canvas[dstIdx + 1] = scaledEmblem[srcIdx + 1];
      canvas[dstIdx + 2] = scaledEmblem[srcIdx + 2];
      canvas[dstIdx + 3] = scaledEmblem[srcIdx + 3];
    }
  }

  return canvas;
}

// Generate sizes
const sizes = [16, 32, 48, 64, 128, 192, 512];
const generatedBuffers = {};

for (const s of sizes) {
  const squareRgba = createSquareFavicon(s);
  const png = makePng(s, s, squareRgba);
  generatedBuffers[s] = png;
}

// Save all required standard web and PWA icon files
fs.writeFileSync('public/icon.png', generatedBuffers[64]);
fs.writeFileSync('src/app/icon.png', generatedBuffers[64]);
fs.writeFileSync('public/apple-touch-icon.png', generatedBuffers[192]);
fs.writeFileSync('public/icon-192.png', generatedBuffers[192]);
fs.writeFileSync('public/icon-512.png', generatedBuffers[512]);

// Multi-resolution ICO for Windows / Chrome tab
const icoBuffer = makeIco([
  { width: 16, height: 16, buffer: generatedBuffers[16] },
  { width: 32, height: 32, buffer: generatedBuffers[32] },
  { width: 48, height: 48, buffer: generatedBuffers[48] },
]);
fs.writeFileSync('public/favicon.ico', icoBuffer);
fs.writeFileSync('src/app/favicon.ico', icoBuffer);

console.log('Successfully generated transparent tab icons & favicons with vibrant contrast!');

