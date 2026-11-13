const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

console.log('Notifications:');
console.log(db.prepare('SELECT * FROM notifications').all());

console.log('Leave requests:');
console.log(db.prepare('SELECT * FROM leave_requests').all());

console.log('Late reasons:');
console.log(db.prepare('SELECT * FROM late_reasons').all());
