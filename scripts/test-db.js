const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

console.log('Testing Database setup...');
try {
  // Check if TypeScript files compile or direct test
  const dbDir = path.join(process.cwd(), 'data');
  console.log('DB Dir:', dbDir);
} catch (e) {
  console.error('Error:', e);
}

