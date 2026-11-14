const fs = require('fs');
const path = require('path');

function replaceColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacements for color names
  content = content.replace(/emerald-600/g, 'blue-600');
  content = content.replace(/emerald-700/g, 'blue-700');
  content = content.replace(/emerald-500/g, 'blue-500');
  content = content.replace(/emerald-400/g, 'blue-400');
  content = content.replace(/emerald-300/g, 'blue-300');
  content = content.replace(/emerald-200/g, 'blue-200');
  content = content.replace(/emerald-100/g, 'blue-100');
  content = content.replace(/emerald-50/g, 'blue-50');
  content = content.replace(/emerald-950/g, 'blue-950');
  content = content.replace(/emerald-900/g, 'blue-900');
  content = content.replace(/emerald-800/g, 'blue-800');

  // RGBA and Hex codes
  content = content.replace(/rgba\(16,\s*185,\s*129,/g, 'rgba(37, 99, 235,');
  content = content.replace(/rgba\(16,185,129,/g, 'rgba(37,99,235,');
  content = content.replace(/#10b981/g, '#2563eb');
  content = content.replace(/#059669/g, '#1d4ed8');
  content = content.replace(/#34d399/g, '#60a5fa');

  // Gradients
  content = content.replace(/from-emerald/g, 'from-blue');
  content = content.replace(/via-emerald/g, 'via-blue');
  content = content.replace(/to-emerald/g, 'to-blue');

  // Neon glow classes
  content = content.replace(/neon-glow-emerald/g, 'neon-glow-blue');
  content = content.replace(/neon-border-emerald/g, 'neon-border-primary');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated theme colors in: ${filePath}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css'))) {
      replaceColorsInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, '../src'));
console.log('Blue theme migration complete!');

