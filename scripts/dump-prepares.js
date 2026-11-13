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
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('db.prepare')) {
      console.log(`${path.basename(file)}:${idx + 1}: ${line.trim().slice(0, 80)}`);
    }
  });
}
