const fs = require('fs');

function transformFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace `db.exec(` with `await db.exec(`
  content = content.replace(/(?<!await\s+)db\.exec\(/g, 'await db.exec(');

  // Replace `db.prepare(` with `await db.prepare(` when NOT preceded by await
  // But wait! If it's `const stmt = db.prepare(...)`, stmt is stored and stmt.run() is called later
  // Let's check where `const ... = db.prepare` without .all / .get / .run occurs
  content = content.replace(/(?<!await\s+)db\.prepare\(/g, 'await db.prepare(');

  // If `await db.prepare` was assigned to a statement variable that is called later:
  // e.g. `const updateStmt = await db.prepare(...)`
  // Then `updateStmt.run(...)` should be `await updateStmt.run(...)`
  content = content.replace(/(?<!await\s+)(\b[a-zA-Z0-9_]+Stmt\.(run|all|get)\()/g, 'await $1');

  return content;
}

const testPath = 'src/app/api/settings/route.ts';
const transformed = transformFile(testPath);
console.log(transformed);

