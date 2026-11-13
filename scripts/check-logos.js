const sharp = require('sharp');
const path = require('path');

async function check() {
  const metaLeft = await sharp(path.join(process.cwd(), 'public', 'logo-imbs-left.png')).metadata();
  const metaRight = await sharp(path.join(process.cwd(), 'public', 'logo-imbs-right.png')).metadata();
  console.log('Left logo:', metaLeft.width, 'x', metaLeft.height);
  console.log('Right logo:', metaRight.width, 'x', metaRight.height);
}
check();

