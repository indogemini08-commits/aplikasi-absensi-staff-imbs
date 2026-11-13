const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const srcPath = 'C:/Users/aldri/.gemini/antigravity/brain/9a4b5ceb-5ac7-4984-ae43-363a51aade6e/.user_uploaded/media_1794539222130_f750e217.png';
const publicDir = path.join(process.cwd(), 'public');

async function extractLogos() {
  const metadata = await sharp(srcPath).metadata();
  console.log('Metadata:', metadata);

  // Left logo: Imam Muzani logo (blue open book/wings with crescent & text)
  // Let's crop x: 40 to 140, y: 40 to 110
  await sharp(srcPath)
    .extract({ left: 35, top: 40, width: 110, height: 75 })
    .toFile(path.join(publicDir, 'logo-imbs-left.png'));

  // Right logo: Yayasan / Emblem logo (gold/brown open book emblem)
  // Let's crop x: 555 to 645, y: 40 to 110
  await sharp(srcPath)
    .extract({ left: 560, top: 40, width: 90, height: 75 })
    .toFile(path.join(publicDir, 'logo-imbs-right.png'));

  console.log('Logos extracted successfully!');
}

extractLogos().catch(console.error);

