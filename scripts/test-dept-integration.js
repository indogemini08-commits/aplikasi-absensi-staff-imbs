async function test() {
  const cookieRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'password123' })
  });
  const cookie = cookieRes.headers.get('set-cookie');
  console.log('Login Superadmin Status:', cookieRes.status, 'Cookie exists:', !!cookie);

  // 1. Departments GET
  const deptRes = await fetch('http://localhost:3000/api/departments', {
    headers: { cookie }
  });
  const deptData = await deptRes.json();
  console.log('\n--- DAFTAR DEPARTEMEN & JADWAL KERJA ---');
  console.log('Total Departemen:', deptData.departments?.length);
  for (const d of deptData.departments || []) {
    console.log(`[${d.code}] ${d.name}`);
    console.log(`  - Jam Kerja: ${d.start_time} - ${d.end_time} WIB`);
    console.log(`  - Hari Kerja: ${d.work_days?.join(', ')} (${d.work_days?.length} hari)`);
    console.log(`  - Toleransi: +${d.grace_period_minutes} menit`);
    console.log(`  - Total Staf Terdaftar: ${d.employee_count} orang`);
  }

  // 2. Employees GET (Auto-Inherited Schedule)
  const empRes = await fetch('http://localhost:3000/api/employees', {
    headers: { cookie }
  });
  const empData = await empRes.json();
  console.log('\n--- DATA PEGAWAI & JADWAL TERINTEGRASI OTOMATIS ---');
  console.log('Total Pegawai:', empData.employees?.length);
  for (const e of empData.employees?.slice(0, 4) || []) {
    console.log(`[${e.nip}] ${e.name} (${e.department_name} / ${e.position})`);
    console.log(`  - Jadwal Departemen Diwarisi: ${e.dept_start_time} - ${e.dept_end_time} WIB`);
    console.log(`  - Hari Kerja: ${e.dept_work_days?.join(', ')}`);
    console.log(`  - Toleransi Keterlambatan: +${e.dept_grace_period} menit`);
  }

  // 3. Board Monitoring
  const boardRes = await fetch('http://localhost:3000/api/schedules/board', {
    headers: { cookie }
  });
  const boardData = await boardRes.json();
  console.log('\n--- PAPAN JADWAL KEHADIRAN (DARI JADWAL DEPARTEMEN) ---');
  console.log('Tanggal:', boardData.date, '| Total Staf:', boardData.items?.length);
  console.log('Statistik:', boardData.stats);
  for (const item of boardData.items?.slice(0, 3) || []) {
    console.log(`- ${item.name} (${item.departmentName}): Jam ${item.plannedIn} - ${item.plannedOut} WIB -> Status: ${item.status}`);
  }

  // 4. Staff Attendance Status
  const staffLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'rahma', password: 'password123' })
  });
  const staffCookie = staffLoginRes.headers.get('set-cookie');
  const staffStatusRes = await fetch('http://localhost:3000/api/attendance/status', {
    headers: { cookie: staffCookie }
  });
  const staffStatus = await staffStatusRes.json();
  console.log('\n--- STATUS ABSENSI PEGAWAI (Ust. Rahmawati - Kepengasuhan) ---');
  console.log('Nama Divisi:', staffStatus.schedule?.departmentName);
  console.log('Jadwal Divisi:', `${staffStatus.schedule?.startTime} - ${staffStatus.schedule?.endTime} WIB`);
  console.log('Hari Kerja Divisi:', staffStatus.schedule?.workDays?.join(', '));
  console.log('Hari Ini Hari Kerja Divisi?:', staffStatus.schedule?.isWorkDay);
  console.log('Toleransi:', `+${staffStatus.schedule?.graceMinutes} menit`);

  // 5. Test Live PUT Update
  const updateRes = await fetch('http://localhost:3000/api/departments', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      id: 'dept-6',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 15,
      workDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      breakStart: '12:00',
      breakEnd: '13:00'
    })
  });
  const updateData = await updateRes.json();
  console.log('\n--- UJI PEMBARUAN JADWAL DEPARTEMEN (TI & Data -> 08:00 - 17:00 WIB, +15m) ---');
  console.log('Hasil Update:', updateData.message);

  // Check IT staff employee update immediately
  const fajarRes = await fetch('http://localhost:3000/api/employees?search=Fajar', {
    headers: { cookie }
  });
  const fajarData = await fajarRes.json();
  const fajar = fajarData.employees?.[0];
  console.log(`Verifikasi Jadwal Fajar (IT): ${fajar?.dept_start_time} - ${fajar?.dept_end_time} WIB, toleransi: +${fajar?.dept_grace_period}m (Otomatis Terupdate Real-Time: ${fajar?.dept_end_time === '17:00' ? 'YA SUKSES' : 'GAGAL'})`);
}

test().catch(console.error);

