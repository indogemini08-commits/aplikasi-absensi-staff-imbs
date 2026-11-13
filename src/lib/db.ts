import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure data directory exists
const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'absensi.db');

// Global database instance
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- 1. Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'staff')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 2. Departments table
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      manager_name TEXT,
      start_time TEXT NOT NULL DEFAULT '07:30',
      end_time TEXT NOT NULL DEFAULT '16:00',
      grace_period_minutes INTEGER NOT NULL DEFAULT 10,
      work_days TEXT NOT NULL DEFAULT '["Senin","Selasa","Rabu","Kamis","Jumat"]',
      daily_schedules TEXT,
      break_start TEXT DEFAULT '12:00',
      break_end TEXT DEFAULT '13:00'
    );

    -- 3. Employees table
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      nip TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      gender TEXT CHECK(gender IN ('L', 'P')),
      phone TEXT,
      department_id TEXT NOT NULL,
      position TEXT NOT NULL,
      join_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'permanent',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    -- 4. Work locations table
    CREATE TABLE IF NOT EXISTS work_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters INTEGER NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- 5. Employee allowed locations
    CREATE TABLE IF NOT EXISTS employee_allowed_locations (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES work_locations(id) ON DELETE CASCADE,
      UNIQUE(employee_id, location_id)
    );

    -- 6. Shift templates
    CREATE TABLE IF NOT EXISTS shift_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      grace_period_minutes INTEGER NOT NULL DEFAULT 10,
      break_start TEXT,
      break_end TEXT,
      work_days TEXT NOT NULL DEFAULT '["Senin","Selasa","Rabu","Kamis","Jumat"]',
      is_default INTEGER NOT NULL DEFAULT 0
    );

    -- 7. Employee schedules
    CREATE TABLE IF NOT EXISTS employee_schedules (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      shift_id TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES shift_templates(id)
    );

    -- 8. Attendance records
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      clock_in_time TEXT,
      clock_in_latitude REAL,
      clock_in_longitude REAL,
      clock_in_accuracy REAL,
      clock_in_distance_meters REAL,
      clock_in_location_id TEXT,
      clock_in_photo TEXT,
      clock_in_status TEXT CHECK(clock_in_status IN ('hadir', 'terlambat')),
      clock_in_minutes_late INTEGER DEFAULT 0,
      clock_out_time TEXT,
      clock_out_latitude REAL,
      clock_out_longitude REAL,
      clock_out_accuracy REAL,
      clock_out_distance_meters REAL,
      clock_out_location_id TEXT,
      clock_out_photo TEXT,
      clock_out_status TEXT CHECK(clock_out_status IN ('normal', 'pulang_cepat')),
      shift_id TEXT,
      device_info TEXT,
      is_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (clock_in_location_id) REFERENCES work_locations(id),
      FOREIGN KEY (clock_out_location_id) REFERENCES work_locations(id),
      FOREIGN KEY (shift_id) REFERENCES shift_templates(id),
      UNIQUE(employee_id, date)
    );

    -- 9. Late reasons
    CREATE TABLE IF NOT EXISTS late_reasons (
      id TEXT PRIMARY KEY,
      attendance_id TEXT UNIQUE NOT NULL,
      employee_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'rejected')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      admin_notes TEXT,
      FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- 10. Leave types
    CREATE TABLE IF NOT EXISTS leave_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      deducts_leave_balance INTEGER NOT NULL DEFAULT 0,
      requires_attachment INTEGER NOT NULL DEFAULT 0,
      max_days INTEGER DEFAULT 12,
      description TEXT
    );

    -- 11. Leave requests
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT,
      emergency_contact TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    -- 12. Leave balances
    CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      allocated_days INTEGER NOT NULL DEFAULT 12,
      used_days INTEGER NOT NULL DEFAULT 0,
      pending_days INTEGER NOT NULL DEFAULT 0,
      remaining_days INTEGER NOT NULL DEFAULT 12,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, year)
    );

    -- 13. Holidays
    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'national' CHECK(type IN ('national', 'institutional')),
      description TEXT
    );

    -- 14. Attendance corrections
    CREATE TABLE IF NOT EXISTS attendance_corrections (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      attendance_id TEXT,
      date TEXT NOT NULL,
      correction_type TEXT NOT NULL CHECK(correction_type IN ('clock_in', 'clock_out', 'both')),
      corrected_clock_in TEXT,
      corrected_clock_out TEXT,
      reason TEXT NOT NULL,
      proof_attachment TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (attendance_id) REFERENCES attendance_records(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- 15. Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      reference_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 16. Audit logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    -- 17. App settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    -- Indexes for high-performance querying
    CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
    CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_requests(employee_id);
    CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
  `);

  // Migrations for existing databases to add department work schedule columns if missing
  try { db.exec(`ALTER TABLE departments ADD COLUMN start_time TEXT NOT NULL DEFAULT '07:30';`); } catch {}
  try { db.exec(`ALTER TABLE departments ADD COLUMN end_time TEXT NOT NULL DEFAULT '16:00';`); } catch {}
  try { db.exec(`ALTER TABLE departments ADD COLUMN grace_period_minutes INTEGER NOT NULL DEFAULT 10;`); } catch {}
  try { db.exec(`ALTER TABLE departments ADD COLUMN work_days TEXT NOT NULL DEFAULT '["Senin","Selasa","Rabu","Kamis","Jumat"]';`); } catch {}
  try { db.exec(`ALTER TABLE departments ADD COLUMN break_start TEXT DEFAULT '12:00';`); } catch {}
  try { db.exec(`ALTER TABLE departments ADD COLUMN break_end TEXT DEFAULT '13:00';`); } catch {}

  // Check if initial seed is needed
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedInitialData(db);
  }
}

function seedInitialData(db: DatabaseSync) {
  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  // Settings
  const insertSetting = db.prepare('INSERT INTO app_settings (key, value, description) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  insertSetting.run('organization_name', 'IMAM MUZANI BOARDING SCHOOL', 'Nama Resmi Sekolah');
  insertSetting.run('foundation_name', 'YAYASAN SABILUL HUDA NAMBO', 'Nama Yayasan');
  insertSetting.run('gov_name', 'PEMERINTAH DAERAH KABUPATEN BOGOR', 'Pemerintah Daerah');
  insertSetting.run('organization_address', 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610', 'Alamat Sekolah');
  insertSetting.run('organization_email', 'imammuzanibs@gmail.com', 'Email Resmi');
  insertSetting.run('organization_phone', '0852 8242 4628', 'Telepon Resmi');
  insertSetting.run('headmaster_name', 'Fauzan Azhiimaa, Lc', 'Nama Kepala Sekolah');
  insertSetting.run('tu_name', 'ALDRI WAHYUDI CHANDRA', 'Nama Tata Usaha');
  insertSetting.run('grace_period_minutes', '10', 'Toleransi keterlambatan dalam menit');
  insertSetting.run('require_selfie', '0', 'Wajib selfie saat absensi (0 = tidak, 1 = wajib)');
  insertSetting.run('default_radius_meters', '100', 'Radius absensi default');
  insertSetting.run('max_gps_accuracy_meters', '50', 'Batas akurasi GPS maksimum yang diterima');
  insertSetting.run('timezone', 'Asia/Jakarta', 'Zona waktu resmi');

  // Work Location: IMBS Tamansari Bogor
  const insertLocation = db.prepare(`
    INSERT INTO work_locations (id, name, address, latitude, longitude, radius_meters, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  insertLocation.run('loc-1', 'Kampus IMBS Tamansari Bogor', 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor', -6.643200, 106.772500, 100, now);

  // 13 Official Departments with 6-day work week
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

  const insertDept = db.prepare(`
    INSERT INTO departments (id, name, code, description, start_time, end_time, grace_period_minutes, work_days, daily_schedules)
    VALUES (?, ?, ?, ?, '07:30', '16:00', 10, ?, ?)
  `);

  for (const d of departmentsData) {
    insertDept.run(d.id, d.name, d.code, d.desc, workDaysSixDays, defaultDailySchedules);
  }

  // Shift Templates
  const insertShift = db.prepare(`
    INSERT INTO shift_templates (id, name, start_time, end_time, grace_period_minutes, break_start, break_end, work_days, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertShift.run('shift-1', 'Reguler Standard (Senin - Sabtu)', '07:30', '16:00', 10, '12:00', '13:00', workDaysSixDays, 1);

  // Leave Types
  const insertLeaveType = db.prepare(`
    INSERT INTO leave_types (id, name, code, deducts_leave_balance, requires_attachment, max_days, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertLeaveType.run('lt-1', 'Cuti Tahunan', 'CUTI_TAHUNAN', 1, 0, 12, 'Hak cuti tahunan pegawai tetap');
  insertLeaveType.run('lt-2', 'Sakit (dengan Surat Dokter)', 'SAKIT_SKD', 0, 1, 14, 'Izin sakit yang dibuktikan dengan SKD');
  insertLeaveType.run('lt-3', 'Dispensasi Dinas Luar', 'DINAS', 0, 0, 30, 'Tugas dinas atau koordinasi di luar kampus IMBS');
  insertLeaveType.run('lt-4', 'Izin Keperluan Mendesak', 'IZIN_MENDESAK', 0, 0, 3, 'Izin tidak masuk karena urusan keluarga mendesak');

  // 22 Real IMBS Staff
  const staffList = [
    { no: 1, name: 'Ustadz Ujang Nasirudin, S.H', deptId: 'dept-mudir', position: 'Mudir' },
    { no: 2, name: 'Ustadz Fauzan Azhiimaa, Lc', deptId: 'dept-kepsek', position: 'Kepala Sekolah' },
    { no: 3, name: 'Ustadz Fakhrur Rodhi Al Hendan, S.H', deptId: 'dept-tahfizh', position: 'Koordinator Tahfizh' },
    { no: 4, name: 'Ustadz Hadi Abdillah, S.Ag', deptId: 'dept-kesantrian', position: 'Kepala Kesantrian' },
    { no: 5, name: 'Ustadz Denih Alfaqi', deptId: 'dept-rumahtangga', position: 'Kepala Rumah Tangga' },
    { no: 6, name: 'Ustadz Nafis Pratama Cahya, S.Ag', deptId: 'dept-bahasa', position: 'Divisi Bahasa Arab' },
    { no: 7, name: 'Ustadz Taqwim Rabbani', deptId: 'dept-bk', position: 'Guru BK' },
    { no: 8, name: 'Ustadz Muhammad Ansarullah', deptId: 'dept-muhafizh', position: 'Muhafizh' },
    { no: 9, name: 'Ustadz Dimas Bagus', deptId: 'dept-muhafizh', position: 'Muhafizh' },
    { no: 10, name: 'Ustadz Dicky Alfauzy', deptId: 'dept-muhafizh', position: 'Muhafizh' },
    { no: 11, name: 'Ustadz Hanip Fauzan, S.Ag', deptId: 'dept-muhafizh', position: 'Muhafizh' },
    { no: 12, name: 'Ustadz Raihan Rachmanullah, S.Pd', deptId: 'dept-muhafizh', position: 'Muhafizh' },
    { no: 13, name: 'Ustadz Rendi Herliandi, S.Ag', deptId: 'dept-asrama', position: 'Kepala Asrama' },
    { no: 14, name: 'Ustadz Ahmadi Sipa, S.H', deptId: 'dept-asrama', position: 'Kepala Asrama' },
    { no: 15, name: 'Ustadz Rama Nurmawijaya', deptId: 'dept-asrama', position: 'Kepala Asrama' },
    { no: 16, name: 'Ustadz Aldri Wahyudi Chandra', deptId: 'dept-tu', position: 'Multimedia & Tata Usaha' },
    { no: 17, name: 'Ustadz Ramdhan', deptId: 'dept-security', position: 'Security' },
    { no: 18, name: 'Pak Abbia Sultan', deptId: 'dept-security', position: 'Security' },
    { no: 19, name: 'Pak Amri', deptId: 'dept-ob', position: 'Office Boy' },
    { no: 20, name: 'Pak Iwan', deptId: 'dept-ob', position: 'Office Boy' },
    { no: 21, name: 'Ibu Anna', deptId: 'dept-masak', position: 'Juru Masak' },
    { no: 22, name: 'Ibu Santi', deptId: 'dept-masak', position: 'Juru Masak' },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const insertEmp = db.prepare(`
    INSERT INTO employees (id, user_id, nip, name, department_id, position, join_date, status, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, '2026-01-01', 'permanent', 1, ?, ?)
  `);

  // Default superadmin & admin accounts
  insertUser.run('usr-superadmin', 'superadmin', 'superadmin@imbs.sch.id', defaultPasswordHash, 'superadmin', now, now);
  insertUser.run('usr-admin', 'admin', 'admin@imbs.sch.id', defaultPasswordHash, 'admin', now, now);
  insertUser.run('usr-aldri', 'aldri', 'aldri@imbs.sch.id', defaultPasswordHash, 'superadmin', now, now);
  insertUser.run('usr-fauzan', 'fauzan', 'fauzan@imbs.sch.id', defaultPasswordHash, 'admin', now, now);

  for (const s of staffList) {
    const nip = `IMBS-${String(s.no).padStart(3, '0')}`;
    const empId = `emp-imbs-${s.no}`;
    const userId = `usr-staff-${s.no}`;
    const username = s.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) + s.no;
    const email = `${username}@imbs.sch.id`;

    let role = 'staff';
    if (s.name.includes('Aldri')) role = 'superadmin';
    if (s.name.includes('Fauzan')) role = 'admin';

    insertUser.run(userId, username, email, defaultPasswordHash, role, now, now);
    insertEmp.run(empId, userId, nip, s.name, s.deptId, s.position, now, now);
  }

  // Initial audit log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run('aud-1', 'usr-superadmin', 'ALDRI WAHYUDI CHANDRA', 'INITIALIZE_SYSTEM', 'system', 'root', JSON.stringify({ message: 'Sistem absensi IMBS diinisialisasi dengan konfigurasi resmi Yayasan Sabilul Huda Nambo.' }), '127.0.0.1', now);
}

