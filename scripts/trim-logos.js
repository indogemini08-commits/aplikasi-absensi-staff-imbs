const sharp = require('sharp');
const path = require('path');

async function refineLogos() {
  const publicDir = path.join(process.cwd(), 'public');
  
  await sharp(path.join(publicDir, 'logo-imbs-left.png'))
    .trim({ threshold: 20 })
    .toFile(path.join(publicDir, 'logo-imbs-left-trimmed.png'));

  await sharp(path.join(publicDir, 'logo-imbs-right.png'))
    .trim({ threshold: 20 })
    .toFile(path.join(publicDir, 'logo-imbs-right-trimmed.png'));

  const metaLeft = await sharp(path.join(publicDir, 'logo-imbs-left-trimmed.png')).metadata();
  const metaRight = await sharp(path.join(publicDir, 'logo-imbs-right-trimmed.png')).metadata();
  console.log('Trimmed Left:', metaLeft.width, 'x', metaLeft.height);
  console.log('Trimmed Right:', metaRight.width, 'x', metaRight.height);
}

refineLogos().catch(console.error);

