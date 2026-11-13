const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
const db = new DatabaseSync(dbPath);

const emps = db.prepare('SELECT e.id, e.name, e.nip, d.name as dept_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id').all();
console.log('Employees count:', emps.length);
console.log(JSON.stringify(emps, null, 2));

const att = db.prepare('SELECT count(*) as count FROM attendance_records').get();
console.log('Attendance records count:', att);

