const fs = require('fs');
const path = require('path');
const publicDir = path.join(process.cwd(), 'public');

fs.copyFileSync(path.join(publicDir, 'logo-imbs-left-trimmed.png'), path.join(publicDir, 'logo-imbs-left.png'));
fs.copyFileSync(path.join(publicDir, 'logo-imbs-right-trimmed.png'), path.join(publicDir, 'logo-imbs-right.png'));
console.log('Copied trimmed logos to final files');

