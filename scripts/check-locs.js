const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));
const locs = db.prepare('SELECT id, name FROM work_locations').all();
console.log('Work locations:', locs);

