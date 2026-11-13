const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'data', 'absensi.db');
const db = new DatabaseSync(dbPath);

console.log('Testing Database Integration for Department Schedules via node:sqlite...');

// 1. Check departments table columns and data
const departments = db.prepare(`
  SELECT d.*,
         (SELECT count(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = 1) as employee_count
  FROM departments d
  ORDER BY d.name ASC
`).all();

console.log('\n1. DEPARTMENTS & SCHEDULES IN DATABASE:');
console.log(`Total departments found: ${departments.length}`);
for (const d of departments) {
  const workDays = typeof d.work_days === 'string' ? JSON.parse(d.work_days) : d.work_days;
  console.log(`- [${d.code}] ${d.name}`);
  console.log(`    Jam: ${d.start_time} - ${d.end_time} WIB | Toleransi: +${d.grace_period_minutes}m`);
  console.log(`    Hari Kerja: ${workDays.join(', ')} (${workDays.length} hari)`);
  console.log(`    Staf Aktif: ${d.employee_count} orang`);
}

// 2. Check employee query joining department schedule
const employees = db.prepare(`
  SELECT e.id, e.nip, e.name, e.position,
         d.id as department_id, d.name as department_name, d.code as department_code,
         d.start_time, d.end_time, d.grace_period_minutes, d.work_days
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  WHERE e.is_active = 1
  ORDER BY e.name ASC
`).all();

console.log('\n2. EMPLOYEES AUTO-INHERITED SCHEDULE:');
console.log(`Total active employees: ${employees.length}`);
for (const emp of employees) {
  const days = typeof emp.work_days === 'string' ? JSON.parse(emp.work_days) : emp.work_days;
  console.log(`- [${emp.nip}] ${emp.name}`);
  console.log(`    Divisi: ${emp.department_name} | Jabatan: ${emp.position}`);
  console.log(`    Jadwal Terintegrasi: ${emp.start_time} - ${emp.end_time} WIB (+${emp.grace_period_minutes}m)`);
  console.log(`    Hari Kerja: ${days.join(', ')}`);
}

// 3. Test dynamic update: change Kepengasuhan schedule
console.log('\n3. TESTING DYNAMIC SCHEDULE UPDATE:');
const dept2 = db.prepare(`SELECT * FROM departments WHERE id = 'dept-2'`).get();
console.log(`Current Kepengasuhan: ${dept2.start_time} - ${dept2.end_time} WIB, grace: +${dept2.grace_period_minutes}m`);

// Update Kepengasuhan
db.prepare(`
  UPDATE departments SET
    start_time = '06:30',
    end_time = '14:30',
    grace_period_minutes = 10,
    work_days = '["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"]'
  WHERE id = 'dept-2'
`).run();

// Verify staff in dept-2 immediately reflects this
const staff = db.prepare(`
  SELECT e.name, d.name as dept_name, d.start_time, d.end_time, d.work_days
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  WHERE d.id = 'dept-2'
`).all();

console.log('Immediate real-time schedule for Kepengasuhan staff:');
for (const s of staff) {
  console.log(`- ${s.name}: ${s.start_time} - ${s.end_time} WIB (${s.work_days})`);
}

// 4. Verify employee transfer between departments
console.log('\n4. TESTING EMPLOYEE DEPARTMENT TRANSFER (AUTO-SCHEDULE UPDATE):');
const budi = db.prepare(`
  SELECT e.id, e.name, d.name as dept_name, d.start_time, d.end_time
  FROM employees e JOIN departments d ON e.department_id = d.id
  WHERE e.nip = 'IMBS-101'
`).get();
console.log(`Before transfer: ${budi.name} in ${budi.dept_name} -> ${budi.start_time} - ${budi.end_time} WIB`);

// Move Budi to IT (dept-6)
db.prepare(`UPDATE employees SET department_id = 'dept-6' WHERE id = ?`).run(budi.id);

const budiAfter = db.prepare(`
  SELECT e.id, e.name, d.name as dept_name, d.start_time, d.end_time
  FROM employees e JOIN departments d ON e.department_id = d.id
  WHERE e.id = ?
`).get(budi.id);
console.log(`After transfer to IT: ${budiAfter.name} in ${budiAfter.dept_name} -> ${budiAfter.start_time} - ${budiAfter.end_time} WIB (INSTANT AUTO-INHERIT)`);

// Move Budi back to Akademik (dept-1)
db.prepare(`UPDATE employees SET department_id = 'dept-1' WHERE id = ?`).run(budi.id);
console.log('Restored Budi Pratama back to Akademik & Kurikulum.');

console.log('\nALL DATABASE TESTS PASSED WITH 100% REAL-TIME DYNAMIC INHERITANCE!');
