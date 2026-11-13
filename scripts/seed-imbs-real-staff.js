const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
const db = new DatabaseSync(dbPath);

console.log('Seeding IMBS official staff & departments from reference...');

const salt = bcrypt.genSaltSync(10);
const defaultHash = bcrypt.hashSync('password123', salt);
const now = new Date().toISOString();

// Update app settings with official institution details
const updateSetting = db.prepare('INSERT INTO app_settings (key, value, description) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
updateSetting.run('organization_name', 'IMAM MUZANI BOARDING SCHOOL', 'Nama Sekolah');
updateSetting.run('foundation_name', 'YAYASAN SABILUL HUDA NAMBO', 'Nama Yayasan');
updateSetting.run('gov_name', 'PEMERINTAH DAERAH KABUPATEN BOGOR', 'Pemerintah Daerah');
updateSetting.run('organization_address', 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610', 'Alamat Sekolah');
updateSetting.run('organization_email', 'imammuzanibs@gmail.com', 'Email Resmi');
updateSetting.run('organization_phone', '0852 8242 4628', 'Telepon Resmi');
updateSetting.run('headmaster_name', 'Fauzan Azhiimaa, Lc', 'Nama Kepala Sekolah');
updateSetting.run('tu_name', 'ALDRI WAHYUDI CHANDRA', 'Nama Tata Usaha');

// Departments
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

const insertDept = db.prepare(`
  INSERT INTO departments (id, name, code, description, start_time, end_time, grace_period_minutes, work_days)
  VALUES (?, ?, ?, ?, '07:30', '16:00', 10, '["Senin","Selasa","Rabu","Kamis","Jumat"]')
  ON CONFLICT(name) DO UPDATE SET code = excluded.code
`);

for (const d of departmentsData) {
  try {
    insertDept.run(d.id, d.name, d.code, d.desc);
  } catch (e) {
    // Already exists or unique constraint
  }
}

// Fetch all departments for mapping
const allDepts = db.prepare('SELECT id, name FROM departments').all();
const deptMap = {};
for (const d of allDepts) {
  deptMap[d.name] = d.id;
}

// 22 IMBS Staff Members from reference document
const staffList = [
  { no: 1, name: 'Ustadz Ujang Nasirudin, S.H', dept: 'Mudir', position: 'Mudir', masuk: 14, pulang: 0, telat: 0, cepat: 0, lupa: 14, alpha: 7, predikat: 'Buruk' },
  { no: 2, name: 'Ustadz Fauzan Azhiimaa, Lc', dept: 'Kepala Sekolah', position: 'Kepala Sekolah', masuk: 10, pulang: 7, telat: 4, cepat: 1, lupa: 3, alpha: 3, predikat: 'Kurang Baik' },
  { no: 3, name: 'Ustadz Fakhrur Rodhi Al Hendan, S.H', dept: 'Koordinator Tahfizh', position: 'Koordinator Tahfizh', masuk: 10, pulang: 10, telat: 4, cepat: 7, lupa: 0, alpha: 3, predikat: 'Kurang Baik' },
  { no: 4, name: 'Ustadz Hadi Abdillah, S.Ag', dept: 'Kepala Kesantrian', position: 'Kepala Kesantrian', masuk: 15, pulang: 5, telat: 5, cepat: 0, lupa: 10, alpha: 6, predikat: 'Buruk' },
  { no: 5, name: 'Ustadz Denih Alfaqi', dept: 'Kepala Rumah Tangga', position: 'Kepala Rumah Tangga', masuk: 19, pulang: 18, telat: 12, cepat: 6, lupa: 1, alpha: 2, predikat: 'Baik' },
  { no: 6, name: 'Ustadz Nafis Pratama Cahya, S.Ag', dept: 'Divsi Bahasa Arab', position: 'Divisi Bahasa Arab', masuk: 17, pulang: 1, telat: 2, cepat: 0, lupa: 16, alpha: 4, predikat: 'Buruk' },
  { no: 7, name: 'Ustadz Taqwim Rabbani', dept: 'Guru BK', position: 'Guru BK', masuk: 20, pulang: 17, telat: 2, cepat: 7, lupa: 3, alpha: 1, predikat: 'Sangat Baik' },
  { no: 8, name: 'Ustadz Muhammad Ansarullah', dept: 'Muhafizh', position: 'Muhafizh', masuk: 16, pulang: 1, telat: 15, cepat: 1, lupa: 15, alpha: 5, predikat: 'Buruk' },
  { no: 9, name: 'Ustadz Dimas Bagus', dept: 'Muhafizh', position: 'Muhafizh', masuk: 18, pulang: 7, telat: 17, cepat: 4, lupa: 11, alpha: 3, predikat: 'Buruk' },
  { no: 10, name: 'Ustadz Dicky Alfauzy', dept: 'Muhafizh', position: 'Muhafizh', masuk: 15, pulang: 0, telat: 15, cepat: 0, lupa: 15, alpha: 6, predikat: 'Buruk' },
  { no: 11, name: 'Ustadz Hanip Fauzan, S.Ag', dept: 'Muhafizh', position: 'Muhafizh', masuk: 0, pulang: 0, telat: 0, cepat: 0, lupa: 0, alpha: 21, predikat: 'Buruk' },
  { no: 12, name: 'Ustadz Raihan Rachmanullah, S.Pd', dept: 'Muhafizh', position: 'Muhafizh', masuk: 0, pulang: 0, telat: 0, cepat: 0, lupa: 0, alpha: 21, predikat: 'Buruk' },
  { no: 13, name: 'Ustadz Rendi Herliandi, S.Ag', dept: 'Kepala Asrama', position: 'Kepala Asrama', masuk: 1, pulang: 0, telat: 1, cepat: 0, lupa: 1, alpha: 20, predikat: 'Buruk' },
  { no: 14, name: 'Ustadz Ahmadi Sipa, S.H', dept: 'Kepala Asrama', position: 'Kepala Asrama', masuk: 17, pulang: 8, telat: 9, cepat: 3, lupa: 9, alpha: 4, predikat: 'Buruk' },
  { no: 15, name: 'Ustadz Rama Nurmawijaya', dept: 'Kepala Asrama', position: 'Kepala Asrama', masuk: 2, pulang: 0, telat: 1, cepat: 0, lupa: 2, alpha: 19, predikat: 'Buruk' },
  { no: 16, name: 'Ustadz Aldri Wahyudi Chandra', dept: 'Multimedia & Tata Usaha', position: 'Multimedia & Tata Usaha', masuk: 18, pulang: 18, telat: 3, cepat: 5, lupa: 0, alpha: 3, predikat: 'Sangat Baik' },
  { no: 17, name: 'Ustadz Ramdhan', dept: 'Scurity', position: 'Security', masuk: 15, pulang: 7, telat: 4, cepat: 7, lupa: 8, alpha: 6, predikat: 'Buruk' },
  { no: 18, name: 'Pak Abbia Sultan', dept: 'Scurity', position: 'Security', masuk: 10, pulang: 0, telat: 3, cepat: 0, lupa: 10, alpha: 11, predikat: 'Buruk' },
  { no: 19, name: 'Pak Amri', dept: 'Office Boy', position: 'Office Boy', masuk: 18, pulang: 8, telat: 16, cepat: 1, lupa: 10, alpha: 3, predikat: 'Buruk' },
  { no: 20, name: 'Pak Iwan', dept: 'Office Boy', position: 'Office Boy', masuk: 20, pulang: 18, telat: 2, cepat: 8, lupa: 2, alpha: 1, predikat: 'Sangat Baik' },
  { no: 21, name: 'Ibu Anna', dept: 'Juru Masak', position: 'Juru Masak', masuk: 16, pulang: 12, telat: 5, cepat: 5, lupa: 4, alpha: 5, predikat: 'Kurang Baik' },
  { no: 22, name: 'Ibu Santi', dept: 'Juru Masak', position: 'Juru Masak', masuk: 16, pulang: 13, telat: 3, cepat: 3, lupa: 3, alpha: 5, predikat: 'Baik' },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, 'staff', 1, ?, ?)
  ON CONFLICT(username) DO NOTHING
`);

const insertEmp = db.prepare(`
  INSERT INTO employees (id, user_id, nip, name, department_id, position, join_date, status, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, '2026-01-01', 'permanent', 1, ?, ?)
  ON CONFLICT(nip) DO UPDATE SET name = excluded.name, department_id = excluded.department_id, position = excluded.position
`);

// Insert users & employees
for (const staff of staffList) {
  const empId = `emp-imbs-${staff.no}`;
  const userId = `user-imbs-${staff.no}`;
  const nip = `IMBS-${String(staff.no).padStart(3, '0')}`;
  const username = staff.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) + staff.no;
  const email = `${username}@imbs.sch.id`;
  const deptId = deptMap[staff.dept] || 'dept-1';

  try {
    insertUser.run(userId, username, email, defaultHash, now, now);
  } catch (e) {}

  // Get user_id if already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  const actualUserId = existingUser ? existingUser.id : userId;

  try {
    insertEmp.run(empId, actualUserId, nip, staff.name, deptId, staff.position, now, now);
  } catch (e) {
    console.error('Emp error:', staff.name, e.message);
  }
}

console.log('Inserted all 22 IMBS staff successfully!');

// Now seed August 2026 attendance records to match the exact counts!
// Period: 2026-08-01 to 2026-08-25
// Let's generate work days in August 2026 (Mon-Fri or Mon-Sat)
const workDates = [];
for (let d = 1; d <= 25; d++) {
  const dayStr = String(d).padStart(2, '0');
  const dateStr = `2026-08-${dayStr}`;
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday
  if (dayOfWeek !== 0) { // Exclude Sundays
    workDates.push(dateStr);
  }
}

console.log('August 2026 (01-25) non-Sunday dates count:', workDates.length);

const validLoc = db.prepare('SELECT id FROM work_locations LIMIT 1').get();
const validLocId = validLoc ? validLoc.id : null;

const insertAttendance = db.prepare(`
  INSERT INTO attendance_records (
    id, employee_id, date, clock_in_time, clock_in_status, clock_in_minutes_late,
    clock_out_time, clock_out_status, clock_in_location_id, clock_out_location_id,
    is_verified, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(employee_id, date) DO UPDATE SET
    clock_in_time = excluded.clock_in_time,
    clock_in_status = excluded.clock_in_status,
    clock_in_minutes_late = excluded.clock_in_minutes_late,
    clock_out_time = excluded.clock_out_time,
    clock_out_status = excluded.clock_out_status
`);

for (const staff of staffList) {
  const emp = db.prepare('SELECT id FROM employees WHERE name = ?').get(staff.name);
  if (!emp) continue;

  // Let's create staff.masuk attendance days
  let masukLeft = staff.masuk;
  let pulangLeft = staff.pulang;
  let telatLeft = staff.telat;
  let cepatLeft = staff.cepat;

  for (let i = 0; i < workDates.length && masukLeft > 0; i++) {
    const date = workDates[i];
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

    const attId = `att-aug-${emp.id}-${date}`;
    insertAttendance.run(
      attId, emp.id, date, inTime, inStatus, minutesLate,
      outTime, outStatus, validLocId, validLocId, now, now
    );
  }
}

console.log('Seeded August 2026 attendance records successfully!');
