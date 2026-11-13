const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('src/app/api');
let totalPrepare = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/db\.prepare/g);
  if (matches) {
    totalPrepare += matches.length;
    console.log(`${file}: ${matches.length} db.prepare`);
  }
}
console.log('Total db.prepare in src/app/api:', totalPrepare);

