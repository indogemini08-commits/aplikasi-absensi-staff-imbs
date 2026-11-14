const sharp = require('sharp');
const path = require('path');

const srcPath = 'C:/Users/aldri/.gemini/antigravity/brain/9a4b5ceb-5ac7-4984-ae43-363a51aade6e/.user_uploaded/media_1794660438067_45cc81a0.webp';

async function main() {
  const img = sharp(srcPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  console.log('Image dimensions:', info.width, info.height);

  for (let y = 0; y < info.height; y += 40) {
    let count = 0;
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      if (data[idx + 3] > 10) count++;
    }
    if (count > 0) {
      console.log(`Row ${y}: ${count} non-transparent pixels`);
    }
  }
}

main().catch(console.error);

