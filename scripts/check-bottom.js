const sharp = require('sharp');

const srcPath = 'C:/Users/aldri/.gemini/antigravity/brain/9a4b5ceb-5ac7-4984-ae43-363a51aade6e/.user_uploaded/media_1794660438067_45cc81a0.webp';

async function main() {
  const img = sharp(srcPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  for (let y = 860; y <= 920; y += 10) {
    let colors = [];
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      if (data[idx + 3] > 10) {
        colors.push(`[${data[idx]},${data[idx+1]},${data[idx+2]},${data[idx+3]}]`);
      }
    }
    console.log(`Row ${y}: ${colors.length} pixels, sample: ${colors.slice(0, 3).join(' ')} ... ${colors.slice(-3).join(' ')}`);
  }
}

main().catch(console.error);

