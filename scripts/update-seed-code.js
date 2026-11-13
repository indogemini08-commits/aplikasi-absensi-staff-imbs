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
}

