// Re-seed database script
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

console.log('Database already initialized in data/absensi.db');

