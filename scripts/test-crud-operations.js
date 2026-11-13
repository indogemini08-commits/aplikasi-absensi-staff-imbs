const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

console.log('Testing CRUD operations across entities...');

// 1. Department CRUD
console.log('1. Testing Department CRUD...');
db.prepare(`
  INSERT INTO departments (id, name, code, description, start_time, end_time, grace_period_minutes, work_days)
  VALUES ('dept-test', 'Divisi Uji Coba', 'TEST', 'Keterangan uji coba', '08:00', '16:00', 10, '["Senin","Selasa"]')
`).run();

const createdDept = db.prepare('SELECT * FROM departments WHERE id = ?').get('dept-test');
if (!createdDept || createdDept.name !== 'Divisi Uji Coba') throw new Error('Dept insert failed');
console.log('   ✓ Department Created:', createdDept.name);

db.prepare('UPDATE departments SET name = ?, code = ? WHERE id = ?').run('Divisi Uji Coba Diperbarui', 'TEST2', 'dept-test');
const updatedDept = db.prepare('SELECT * FROM departments WHERE id = ?').get('dept-test');
if (!updatedDept || updatedDept.name !== 'Divisi Uji Coba Diperbarui') throw new Error('Dept update failed');
console.log('   ✓ Department Updated:', updatedDept.name);

db.prepare('DELETE FROM departments WHERE id = ?').run('dept-test');
const deletedDept = db.prepare('SELECT * FROM departments WHERE id = ?').get('dept-test');
if (deletedDept) throw new Error('Dept delete failed');
console.log('   ✓ Department Deleted successfully!');

// 2. Location CRUD
console.log('2. Testing Location CRUD...');
db.prepare(`
  INSERT INTO work_locations (id, name, address, latitude, longitude, radius_meters, is_active, created_at)
  VALUES ('loc-test', 'Pos Keamanan Gerbang', 'Jl. Dukuh Manis No. 1', -6.643300, 106.772600, 50, 1, ?)
`).run(new Date().toISOString());

const createdLoc = db.prepare('SELECT * FROM work_locations WHERE id = ?').get('loc-test');
if (!createdLoc || createdLoc.name !== 'Pos Keamanan Gerbang') throw new Error('Location insert failed');
console.log('   ✓ Location Created:', createdLoc.name);

db.prepare('UPDATE work_locations SET radius_meters = 80 WHERE id = ?').run('loc-test');
const updatedLoc = db.prepare('SELECT * FROM work_locations WHERE id = ?').get('loc-test');
if (updatedLoc.radius_meters !== 80) throw new Error('Location update failed');
console.log('   ✓ Location Updated radius to 80m');

db.prepare('DELETE FROM work_locations WHERE id = ?').run('loc-test');
const deletedLoc = db.prepare('SELECT * FROM work_locations WHERE id = ?').get('loc-test');
if (deletedLoc) throw new Error('Location delete failed');
console.log('   ✓ Location Deleted successfully!');

// 3. Employee CRUD
console.log('3. Testing Employee CRUD...');
const now = new Date().toISOString();
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
  VALUES ('usr-test-crud', 'usertestcrud', 'testcrud@imbs.sch.id', 'hash', 'staff', 1, ?, ?)
`).run(now, now);

db.prepare(`
  INSERT INTO employees (id, user_id, nip, name, department_id, position, join_date, status, is_active, created_at, updated_at)
  VALUES ('emp-test-crud', 'usr-test-crud', 'IMBS-999', 'Pegawai Uji Coba', 'dept-mudir', 'Staff Uji', '2026-01-01', 'permanent', 1, ?, ?)
`).run(now, now);

const createdEmp = db.prepare('SELECT * FROM employees WHERE id = ?').get('emp-test-crud');
if (!createdEmp || createdEmp.name !== 'Pegawai Uji Coba') throw new Error('Emp insert failed');
console.log('   ✓ Employee Created:', createdEmp.name);

db.prepare('DELETE FROM employees WHERE id = ?').run('emp-test-crud');
db.prepare('DELETE FROM users WHERE id = ?').run('usr-test-crud');
const deletedEmp = db.prepare('SELECT * FROM employees WHERE id = ?').get('emp-test-crud');
if (deletedEmp) throw new Error('Emp delete failed');
console.log('   ✓ Employee Deleted successfully!');

console.log('=== All CRUD operations tested and working 100% normally! ===');

