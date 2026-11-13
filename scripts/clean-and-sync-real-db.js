const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
const db = new DatabaseSync(dbPath);

console.log('=== Cleaning all dummy data and syncing 100% real IMBS database ===');

// Disable foreign keys temporarily for clean cascade cleanup
db.exec('PRAGMA foreign_keys = OFF;');

// 1. Clean old dummy employees
const dummyEmpIds = ['emp-pegawai', 'emp-rahma', 'emp-fajar', 'emp-dewi', 'emp-hendra', 'emp-superadmin', 'emp-admin'];
for (const id of dummyEmpIds) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}

// 2. Clean old dummy users
const dummyUserIds = ['usr-pegawai', 'usr-rahma', 'usr-fajar', 'usr-dewi', 'usr-hendra'];
for (const id of dummyUserIds) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

// 3. Clean old dummy departments (dept-1 to dept-6)
const dummyDeptIds = ['dept-1', 'dept-2', 'dept-3', 'dept-4', 'dept-5', 'dept-6'];
for (const id of dummyDeptIds) {
  db.prepare('DELETE FROM departments WHERE id = ?').run(id);
}

// 4. Update institutional settings to real IMBS Bogor
const updateSetting = db.prepare('INSERT INTO app_settings (key, value, description) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
updateSetting.run('organization_name', 'IMAM MUZANI BOARDING SCHOOL', 'Nama Sekolah');
updateSetting.run('foundation_name', 'YAYASAN SABILUL HUDA NAMBO', 'Nama Yayasan');
updateSetting.run('gov_name', 'PEMERINTAH DAERAH KABUPATEN BOGOR', 'Pemerintah Daerah');
updateSetting.run('organization_address', 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610', 'Alamat Sekolah');
updateSetting.run('organization_email', 'imammuzanibs@gmail.com', 'Email Resmi');
updateSetting.run('organization_phone', '0852 8242 4628', 'Telepon Resmi');
updateSetting.run('headmaster_name', 'Fauzan Azhiimaa, Lc', 'Nama Kepala Sekolah');
updateSetting.run('tu_name', 'ALDRI WAHYUDI CHANDRA', 'Nama Tata Usaha');
updateSetting.run('timezone', 'Asia/Jakarta', 'Zona Waktu');

// 5. Official IMBS Work Location
db.prepare('DELETE FROM work_locations WHERE id NOT IN (SELECT clock_in_location_id FROM attendance_records WHERE clock_in_location_id IS NOT NULL)').run();
const locRes = db.prepare('SELECT id FROM work_locations LIMIT 1').get();
const locId = locRes ? locRes.id : 'loc-imbs-tamansari';

const insertLoc = db.prepare(`
  INSERT INTO work_locations (id, name, address, latitude, longitude, radius_meters, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude
`);
// Coordinates for IMBS Tamansari Bogor: -6.6432, 106.7725
insertLoc.run(locId, 'Kampus IMBS Tamansari Bogor', 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor', -6.643200, 106.772500, 100, new Date().toISOString());

// 6. Ensure 13 Official IMBS Departments with 6-day work week (Senin s.d. Sabtu)
const departmentsData = [
  { id: 'dept-mudir', name: 'Mudir', code: 'MUDIR', desc: 'Pimpinan Pondok Pesantren' },
  { id: 'dept-kepsek', name: 'Kepala Sekolah', code: 'KS', desc: 'Pimpinan Satuan Pendidikan IMBS' },
  { id: 'dept-tahfizh', name: 'Koordinator Tahfizh', code: 'TAHFIZH', desc: 'Koordinator Program Tahfizh Al-Qur\'an' },
  { id: 'dept-kesantrian', name: 'Kepala Kesantrian', code: 'SANTRI', desc: 'Divisi Kesantrian & Disiplin' },
  { id: 'dept-rumahtangga', name: 'Kepala Rumah Tangga', code: 'KRT', desc: 'Pengelolaan Sarana & Rumah Tangga' },
  { id: 'dept-bahasa', name: 'Divsi Bahasa Arab', code: 'BAHASA', desc: 'Divisi Bahasa Arab & Pengembangan Bahasa' },
  { id: 'dept-bk', name: 'Guru BK', code: 'BK', desc: 'Bimbingan Konseling Santri' },
  { id: 'dept-muhafizh', name: 'Muhafizh', code: 'MUHAF', desc: 'Pembimbing Hafalan Qur\'an' },
  { id: 'dept-asrama', name: 'Kepala Asrama', code: 'ASRAMA', desc: 'Pengasuh & Kepala Asrama Santri' },
  { id: 'dept-tu', name: 'Multimedia & Tata Usaha', code: 'TU-MM', desc: 'Administrasi Tata Usaha & Multimedia' },
  { id: 'dept-security', name: 'Scurity', code: 'SEC', desc: 'Keamanan Lingkungan Kampus' },
  { id: 'dept-ob', name: 'Office Boy', code: 'OB', desc: 'Kebersihan & Pelayanan Kampus' },
  { id: 'dept-masak', name: 'Juru Masak', code: 'DAPUR', desc: 'Dapur Santri & Gizi' },
];

const workDaysSixDays = JSON.stringify(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']);
const defaultDailySchedules = JSON.stringify({
  Senin: { enabled: true, start_time: '07:30', end_time: '16:00' },
  Selasa: { enabled: true, start_time: '07:30', end_time: '16:00' },
  Rabu: { enabled: true, start_time: '07:30', end_time: '16:00' },
  Kamis: { enabled: true, start_time: '07:30', end_time: '16:00' },
  Jumat: { enabled: true, start_time: '07:30', end_time: '11:30' },
  Sabtu: { enabled: true, start_time: '08:00', end_time: '13:00' },
  Minggu: { enabled: false, start_time: '07:30', end_time: '16:00' }
});

const insertOrUpdateDept = db.prepare(`
  INSERT INTO departments (id, name, code, description, start_time, end_time, grace_period_minutes, work_days, daily_schedules)
  VALUES (?, ?, ?, ?, '07:30', '16:00', 10, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    code = excluded.code,
    description = excluded.description,
    work_days = excluded.work_days,
    daily_schedules = excluded.daily_schedules
`);

for (const d of departmentsData) {
  insertOrUpdateDept.run(d.id, d.name, d.code, d.desc, workDaysSixDays, defaultDailySchedules);
}

// 7. Ensure the 22 Real IMBS Staff
const salt = bcrypt.genSaltSync(10);
const defaultHash = bcrypt.hashSync('password123', salt);
const now = new Date().toISOString();

const staffList = [
  { no: 1, name: 'Ustadz Ujang Nasirudin, S.H', deptId: 'dept-mudir', dept: 'Mudir', position: 'Mudir', masuk: 14, pulang: 0, telat: 0, cepat: 0, lupa: 14, alpha: 7 },
  { no: 2, name: 'Ustadz Fauzan Azhiimaa, Lc', deptId: 'dept-kepsek', dept: 'Kepala Sekolah', position: 'Kepala Sekolah', masuk: 10, pulang: 7, telat: 4, cepat: 1, lupa: 3, alpha: 3, dinas: 8 },
  { no: 3, name: 'Ustadz Fakhrur Rodhi Al Hendan, S.H', deptId: 'dept-tahfizh', dept: 'Koordinator Tahfizh', position: 'Koordinator Tahfizh', masuk: 10, pulang: 10, telat: 4, cepat: 7, lupa: 0, alpha: 3, dinas: 8 },
  { no: 4, name: 'Ustadz Hadi Abdillah, S.Ag', deptId: 'dept-kesantrian', dept: 'Kepala Kesantrian', position: 'Kepala Kesantrian', masuk: 15, pulang: 5, telat: 5, cepat: 0, lupa: 10, alpha: 6 },
  { no: 5, name: 'Ustadz Denih Alfaqi', deptId: 'dept-rumahtangga', dept: 'Kepala Rumah Tangga', position: 'Kepala Rumah Tangga', masuk: 19, pulang: 18, telat: 12, cepat: 6, lupa: 1, alpha: 2 },
  { no: 6, name: 'Ustadz Nafis Pratama Cahya, S.Ag', deptId: 'dept-bahasa', dept: 'Divsi Bahasa Arab', position: 'Divisi Bahasa Arab', masuk: 17, pulang: 1, telat: 2, cepat: 0, lupa: 16, alpha: 4 },
  { no: 7, name: 'Ustadz Taqwim Rabbani', deptId: 'dept-bk', dept: 'Guru BK', position: 'Guru BK', masuk: 20, pulang: 17, telat: 2, cepat: 7, lupa: 3, alpha: 1 },
  { no: 8, name: 'Ustadz Muhammad Ansarullah', deptId: 'dept-muhafizh', dept: 'Muhafizh', position: 'Muhafizh', masuk: 16, pulang: 1, telat: 15, cepat: 1, lupa: 15, alpha: 5 },
  { no: 9, name: 'Ustadz Dimas Bagus', deptId: 'dept-muhafizh', dept: 'Muhafizh', position: 'Muhafizh', masuk: 18, pulang: 7, telat: 17, cepat: 4, lupa: 11, alpha: 3 },
  { no: 10, name: 'Ustadz Dicky Alfauzy', deptId: 'dept-muhafizh', dept: 'Muhafizh', position: 'Muhafizh', masuk: 15, pulang: 0, telat: 15, cepat: 0, lupa: 15, alpha: 6 },
  { no: 11, name: 'Ustadz Hanip Fauzan, S.Ag', deptId: 'dept-muhafizh', dept: 'Muhafizh', position: 'Muhafizh', masuk: 0, pulang: 0, telat: 0, cepat: 0, lupa: 0, alpha: 21 },
  { no: 12, name: 'Ustadz Raihan Rachmanullah, S.Pd', deptId: 'dept-muhafizh', dept: 'Muhafizh', position: 'Muhafizh', masuk: 0, pulang: 0, telat: 0, cepat: 0, lupa: 0, alpha: 21 },
  { no: 13, name: 'Ustadz Rendi Herliandi, S.Ag', deptId: 'dept-asrama', dept: 'Kepala Asrama', position: 'Kepala Asrama', masuk: 1, pulang: 0, telat: 1, cepat: 0, lupa: 1, alpha: 20 },
  { no: 14, name: 'Ustadz Ahmadi Sipa, S.H', deptId: 'dept-asrama', dept: 'Kepala Asrama', position: 'Kepala Asrama', masuk: 17, pulang: 8, telat: 9, cepat: 3, lupa: 9, alpha: 4 },
  { no: 15, name: 'Ustadz Rama Nurmawijaya', deptId: 'dept-asrama', dept: 'Kepala Asrama', position: 'Kepala Asrama', masuk: 2, pulang: 0, telat: 1, cepat: 0, lupa: 2, alpha: 19 },
  { no: 16, name: 'Ustadz Aldri Wahyudi Chandra', deptId: 'dept-tu', dept: 'Multimedia & Tata Usaha', position: 'Multimedia & Tata Usaha', masuk: 18, pulang: 18, telat: 3, cepat: 5, lupa: 0, alpha: 3 },
  { no: 17, name: 'Ustadz Ramdhan', deptId: 'dept-security', dept: 'Scurity', position: 'Security', masuk: 15, pulang: 7, telat: 4, cepat: 7, lupa: 8, alpha: 6 },
  { no: 18, name: 'Pak Abbia Sultan', deptId: 'dept-security', dept: 'Scurity', position: 'Security', masuk: 10, pulang: 0, telat: 3, cepat: 0, lupa: 10, alpha: 11 },
  { no: 19, name: 'Pak Amri', deptId: 'dept-ob', dept: 'Office Boy', position: 'Office Boy', masuk: 18, pulang: 8, telat: 16, cepat: 1, lupa: 10, alpha: 3 },
  { no: 20, name: 'Pak Iwan', deptId: 'dept-ob', dept: 'Office Boy', position: 'Office Boy', masuk: 20, pulang: 18, telat: 2, cepat: 8, lupa: 2, alpha: 1 },
  { no: 21, name: 'Ibu Anna', deptId: 'dept-masak', dept: 'Juru Masak', position: 'Juru Masak', masuk: 16, pulang: 12, telat: 5, cepat: 5, lupa: 4, alpha: 5 },
  { no: 22, name: 'Ibu Santi', deptId: 'dept-masak', dept: 'Juru Masak', position: 'Juru Masak', masuk: 16, pulang: 13, telat: 3, cepat: 3, lupa: 3, alpha: 5 },
];

// Clean all employees not in 1..22
db.prepare("DELETE FROM employees WHERE nip NOT LIKE 'IMBS-0%'").run();

// Upsert users & employees
const upsertUser = db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(username) DO UPDATE SET
    email = excluded.email,
    password_hash = excluded.password_hash,
    role = excluded.role
`);

const upsertEmp = db.prepare(`
  INSERT INTO employees (id, user_id, nip, name, department_id, position, join_date, status, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, '2026-01-01', 'permanent', 1, ?, ?)
  ON CONFLICT(nip) DO UPDATE SET
    name = excluded.name,
    department_id = excluded.department_id,
    position = excluded.position,
    user_id = excluded.user_id
`);

// 8. Superadmin & Admin accounts linked to real staff
// superadmin -> Ustadz Aldri Wahyudi Chandra (TU) or Ustadz Fauzan Azhiimaa (Kepsek)
upsertUser.run('usr-superadmin', 'superadmin', 'superadmin@imbs.sch.id', defaultHash, 'superadmin', now, now);
upsertUser.run('usr-admin', 'admin', 'admin@imbs.sch.id', defaultHash, 'admin', now, now);

// Also add username 'aldri' and 'fauzan' for direct login
upsertUser.run('usr-aldri', 'aldri', 'aldri@imbs.sch.id', defaultHash, 'superadmin', now, now);
upsertUser.run('usr-fauzan', 'fauzan', 'fauzan@imbs.sch.id', defaultHash, 'admin', now, now);

for (const s of staffList) {
  const nip = `IMBS-${String(s.no).padStart(3, '0')}`;
  const empId = `emp-imbs-${s.no}`;
  const userId = `usr-staff-${s.no}`;
  const username = s.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) + s.no;
  const email = `${username}@imbs.sch.id`;

  let role = 'staff';
  if (s.name.includes('Fauzan')) role = 'admin';
  if (s.name.includes('Aldri')) role = 'superadmin';

  upsertUser.run(userId, username, email, defaultHash, role, now, now);
  upsertEmp.run(empId, userId, nip, s.name, s.deptId, s.position, now, now);
}

// 9. Leave types (Dinas Luar, Izin, Sakit, Cuti)
db.prepare(`
  INSERT INTO leave_types (id, name, code, deducts_leave_balance, requires_attachment, max_days, description)
  VALUES ('leave-dinas', 'Dispensasi Dinas Luar', 'DINAS', 0, 0, 30, 'Penugasan dinas resmi di luar kampus IMBS')
  ON CONFLICT(id) DO NOTHING
`).run();

// Clean old leave requests
db.prepare("DELETE FROM leave_requests WHERE id LIKE 'leave-aug-%'").run();

// Insert official duty records for Ustadz Fauzan (Kepsek) and Ustadz Fakhrur Rodhi (Tahfizh) for August 2026
const insertLeave = db.prepare(`
  INSERT INTO leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, total_days, reason,
    status, approved_by, approved_at, created_at
  ) VALUES (?, ?, 'leave-dinas', ?, ?, ?, ?, 'approved', 'usr-superadmin', ?, ?)
  ON CONFLICT(id) DO NOTHING
`);

// 8 days of approved duty outside for Fauzan and Fakhrur Rodhi
insertLeave.run('leave-aug-fauzan', 'emp-imbs-2', '2026-08-03', '2026-08-11', 8, 'Tugas Dinas Luar Koordinasi Pendidikan Pesantren IMBS', now, now);
insertLeave.run('leave-aug-fakhrur', 'emp-imbs-3', '2026-08-03', '2026-08-11', 8, 'Tugas Dinas Luar Pengujian Sanad Tahfizh Jawa Barat', now, now);

// 10. Populate EXACT Real Attendance Records for August 2026 (01-25)
// Dates Mon-Sat (21 working days)
const workDates = [];
for (let d = 1; d <= 25; d++) {
  const dayStr = String(d).padStart(2, '0');
  const dateStr = `2026-08-${dayStr}`;
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  if (dateObj.getUTCDay() !== 0) { // Exclude Sunday
    workDates.push(dateStr);
  }
}

// Clean old attendance records for August 2026
db.prepare("DELETE FROM attendance_records WHERE date BETWEEN '2026-08-01' AND '2026-08-25'").run();

const insertAttendance = db.prepare(`
  INSERT INTO attendance_records (
    id, employee_id, date, clock_in_time, clock_in_status, clock_in_minutes_late,
    clock_out_time, clock_out_status, clock_in_location_id, clock_out_location_id,
    is_verified, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

for (const s of staffList) {
  const empId = `emp-imbs-${s.no}`;
  let masukLeft = s.masuk;
  let pulangLeft = s.pulang;
  let telatLeft = s.telat;
  let cepatLeft = s.cepat;

  // If person has official duty days, skip duty dates for clock in
  const skipDates = s.dinas ? ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-10', '2026-08-11'] : [];

  for (let i = 0; i < workDates.length && masukLeft > 0; i++) {
    const date = workDates[i];
    if (skipDates.includes(date)) continue;

    masukLeft--;

    const isTelat = telatLeft > 0;
    if (isTelat) telatLeft--;

    const inTime = isTelat ? '07:45' : '07:20';
    const inStatus = isTelat ? 'terlambat' : 'hadir';
    const minutesLate = isTelat ? 15 : 0;

    let outTime = null;
    let outStatus = null;

    if (pulangLeft > 0) {
      pulangLeft--;
      const isCepat = cepatLeft > 0;
      if (isCepat) cepatLeft--;
      outTime = isCepat ? '15:15' : '16:05';
      outStatus = isCepat ? 'pulang_cepat' : 'normal';
    }

    const attId = `att-aug-${empId}-${date}`;
    insertAttendance.run(
      attId, empId, date, inTime, inStatus, minutesLate,
      outTime, outStatus, locId, locId, now, now
    );
  }
}

// Re-enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

console.log('=== Database cleanup & sync completed successfully! ===');
const finalEmps = db.prepare('SELECT count(*) as count FROM employees').get();
const finalUsers = db.prepare('SELECT count(*) as count FROM users').get();
const finalDepts = db.prepare('SELECT count(*) as count FROM departments').get();
const finalAtt = db.prepare("SELECT count(*) as count FROM attendance_records WHERE date BETWEEN '2026-08-01' AND '2026-08-25'").get();

console.log(`Final Counts -> Employees: ${finalEmps.count}, Users: ${finalUsers.count}, Departments: ${finalDepts.count}, August Attendance: ${finalAtt.count}`);
