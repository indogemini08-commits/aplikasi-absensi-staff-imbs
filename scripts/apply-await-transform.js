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

function transform(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. db.exec -> await db.exec
  content = content.replace(/(?<!await\s+)db\.exec\(/g, 'await db.exec(');

  // 2. db.prepare -> await db.prepare
  content = content.replace(/(?<!await\s+)db\.prepare\(/g, 'await db.prepare(');

  // 3. updateStmt.run -> await updateStmt.run
  content = content.replace(/(?<!await\s+)(\b[a-zA-Z0-9_]+Stmt\.(run|all|get)\()/g, 'await $1');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

const files = walk('src/app/api');
for (const f of files) {
  transform(f);
}
console.log('Transformation complete!');
