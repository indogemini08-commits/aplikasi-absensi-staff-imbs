const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

console.log('=== USERS ===');
console.log(db.prepare('SELECT id, username, email, role FROM users').all());

console.log('\n=== EMPLOYEES ===');
console.log(db.prepare('SELECT e.id, e.nip, e.name, e.position, d.name as dept FROM employees e LEFT JOIN departments d ON e.department_id = d.id').all());

console.log('\n=== DEPARTMENTS ===');
console.log(db.prepare('SELECT id, name, code, work_days FROM departments').all());

