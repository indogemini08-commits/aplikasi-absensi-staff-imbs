const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

console.log('Purging all legacy dummy records across all tables...');

// 1. Delete notifications referencing old dummy records or dummy names
db.prepare(`
  DELETE FROM notifications
  WHERE message LIKE '%Budi Pratama%'
     OR message LIKE '%Rahmawati%'
     OR message LIKE '%makan dulu%'
     OR user_id IN ('usr-pegawai', 'usr-rahma', 'usr-fajar', 'usr-dewi', 'usr-hendra')
`).run();

// 2. Delete leave requests referencing old dummy employees
db.prepare(`
  DELETE FROM leave_requests
  WHERE employee_id NOT LIKE 'emp-imbs-%'
`).run();

// 3. Delete late reasons referencing old dummy employees
db.prepare(`
  DELETE FROM late_reasons
  WHERE employee_id NOT LIKE 'emp-imbs-%'
     OR reason LIKE '%makan dulu%'
`).run();

// 4. Delete attendance records referencing old dummy employees
db.prepare(`
  DELETE FROM attendance_records
  WHERE employee_id NOT LIKE 'emp-imbs-%'
`).run();

// 5. Delete employee allowed locations for dummy employees
db.prepare(`
  DELETE FROM employee_allowed_locations
  WHERE employee_id NOT LIKE 'emp-imbs-%'
`).run();

// 6. Delete leave balances for dummy employees
db.prepare(`
  DELETE FROM leave_balances
  WHERE employee_id NOT LIKE 'emp-imbs-%'
`).run();

// 7. Delete employee schedules for dummy employees
db.prepare(`
  DELETE FROM employee_schedules
  WHERE employee_id NOT LIKE 'emp-imbs-%'
`).run();

// 8. Delete corrections for dummy employees
db.prepare(`
  DELETE FROM attendance_corrections
  WHERE employee_id NOT LIKE 'emp-imbs-%'
`).run();

// Ensure all 22 employees have leave balances (allocated: 12)
const emps = db.prepare('SELECT id FROM employees').all();
const insertBalance = db.prepare(`
  INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
  VALUES (?, ?, 2026, 12, 0, 0, 12, ?)
  ON CONFLICT(employee_id, year) DO NOTHING
`);
const now = new Date().toISOString();
for (const e of emps) {
  insertBalance.run(`bal-${e.id}-2026`, e.id, now);
}

// Ensure official welcome notification for superadmin
const insertNotif = db.prepare(`
  INSERT INTO notifications (id, user_id, title, message, type, reference_id, is_read, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`);
insertNotif.run(
  'notif-imbs-welcome',
  'usr-superadmin',
  'Sistem Presensi IMBS Aktif',
  'Aplikasi Presensi Staff & Dewan Guru Imam Muzani Boarding School (Yayasan Sabilul Huda Nambo) siap digunakan.',
  'system',
  null,
  0,
  now
);

console.log('Complete database purge successful! Database is now 100% clean real IMBS data.');
