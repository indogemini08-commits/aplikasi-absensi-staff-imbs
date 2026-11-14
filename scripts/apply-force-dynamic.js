const fs = require('fs');
const path = require('path');

function getRouteFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getRouteFiles(fullPath));
    } else if (file === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const files = getRouteFiles(apiDir);

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!content.includes("export const dynamic = 'force-dynamic'")) {
    // Insert export const dynamic right after imports
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIdx = i;
      }
    }

    if (lastImportIdx !== -1) {
      lines.splice(
        lastImportIdx + 1,
        0,
        '',
        "export const dynamic = 'force-dynamic';",
        'export const revalidate = 0;'
      );
      content = lines.join('\n');
      changed = true;
    }
  }

  // Ensure NO_CACHE_HEADERS is imported or NextResponse has no-cache headers
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Updated:', path.relative(path.join(__dirname, '..'), file));
  }
}

console.log(`Total updated: ${count} routes.`);

