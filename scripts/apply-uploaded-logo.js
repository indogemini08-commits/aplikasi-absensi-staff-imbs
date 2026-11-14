const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcWebp = 'C:/Users/aldri/.gemini/antigravity/brain/9a4b5ceb-5ac7-4984-ae43-363a51aade6e/.user_uploaded/media_1794660438067_45cc81a0.webp';

function makeIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = Buffer.alloc(count * 16);
  let offset = 6 + count * 16;

  for (let i = 0; i < count; i++) {
    const { size, buffer } = pngBuffers[i];
    entries.writeUInt8(size >= 256 ? 0 : size, i * 16 + 0);
    entries.writeUInt8(size >= 256 ? 0 : size, i * 16 + 1);
    entries.writeUInt8(0, i * 16 + 2); // Colors
    entries.writeUInt8(0, i * 16 + 3); // Reserved
    entries.writeUInt16LE(1, i * 16 + 4); // Color planes
    entries.writeUInt16LE(32, i * 16 + 6); // Bits per pixel
    entries.writeUInt32LE(buffer.length, i * 16 + 8); // Size
    entries.writeUInt32LE(offset, i * 16 + 12); // Offset
    offset += buffer.length;
  }

  const chunks = [header, entries];
  for (const item of pngBuffers) {
    chunks.push(item.buffer);
  }
  return Buffer.concat(chunks);
}

async function generateAll() {
  console.log('Loading source image...');
  // Trim the transparent margin so the icon is prominent
  const trimmedBuffer = await sharp(srcWebp)
    .trim({ threshold: 5 })
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log('Trimmed size:', trimmedMeta.width, 'x', trimmedMeta.height);

  // Place on a square canvas with balanced 4% padding
  const maxDim = Math.max(trimmedMeta.width, trimmedMeta.height);
  const canvasSize = Math.round(maxDim * 1.08); // 4% padding on each side

  const centeredMaster = await sharp(trimmedBuffer)
    .resize({
      width: Math.round(trimmedMeta.width),
      height: Math.round(trimmedMeta.height),
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: Math.round((canvasSize - trimmedMeta.height) / 2),
      bottom: canvasSize - trimmedMeta.height - Math.round((canvasSize - trimmedMeta.height) / 2),
      left: Math.round((canvasSize - trimmedMeta.width) / 2),
      right: canvasSize - trimmedMeta.width - Math.round((canvasSize - trimmedMeta.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  console.log('Centered master generated.');

  // Generate various sizes
  const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];
  const rendered = {};

  for (const s of sizes) {
    rendered[s] = await sharp(centeredMaster)
      .resize(s, s, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
    console.log(`Rendered ${s}x${s}: ${rendered[s].length} bytes`);
  }

  // Create favicon.ico with 16, 32, 48, 64
  const icoBuffer = makeIco([
    { size: 16, buffer: rendered[16] },
    { size: 32, buffer: rendered[32] },
    { size: 48, buffer: rendered[48] },
    { size: 64, buffer: rendered[64] }
  ]);

  // Target paths to overwrite
  const targets = [
    { path: 'public/favicon.ico', buffer: icoBuffer },
    { path: 'src/app/favicon.ico', buffer: icoBuffer },
    { path: 'public/icon.png', buffer: rendered[64] },
    { path: 'src/app/icon.png', buffer: rendered[64] },
    { path: 'public/apple-touch-icon.png', buffer: rendered[180] },
    { path: 'public/icon-192.png', buffer: rendered[192] },
    { path: 'public/icon-512.png', buffer: rendered[512] },
    { path: 'public/app-logo.png', buffer: rendered[512] }
  ];

  for (const t of targets) {
    const fullPath = path.join(process.cwd(), t.path);
    fs.writeFileSync(fullPath, t.buffer);
    console.log(`Saved: ${t.path} (${t.buffer.length} bytes)`);
  }

  console.log('All brand assets successfully generated!');
}

generateAll().catch(console.error);

