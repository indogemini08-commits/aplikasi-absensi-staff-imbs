const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

const startDate = '2026-08-01';
const endDate = '2026-08-25';

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function determinePredikat(masuk, pulang, telat, cepat, lupa, alpha, totalDays) {
  if (lupa >= 8 || alpha >= 6 || masuk < 5 || telat >= 14) {
    return 'Buruk';
  }
  const attRate = totalDays > 0 ? (masuk / totalDays) : 0;
  if (attRate >= 0.85 && telat <= 3 && lupa <= 3 && alpha <= 3) {
    return 'Sangat Baik';
  }
  if (attRate >= 0.70 && lupa <= 3 && alpha <= 5) {
    return 'Baik';
  }
  return 'Kurang Baik';
}

const allDatesInRange = [];
let curDate = new Date(`${startDate}T12:00:00Z`);
const stopDate = new Date(`${endDate}T12:00:00Z`);
while (curDate <= stopDate) {
  allDatesInRange.push(curDate.toISOString().split('T')[0]);
  curDate.setUTCDate(curDate.getUTCDate() + 1);
}

const employees = db.prepare(`
  SELECT e.id, e.name, e.nip, d.name as dept_name, d.work_days
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  ORDER BY CAST(SUBSTR(e.nip, 6) AS INTEGER) ASC
`).all();

console.log('Testing PURE DYNAMIC CALCULATION for', employees.length, 'employees:');

for (const emp of employees) {
  const records = db.prepare(`
    SELECT * FROM attendance_records
    WHERE employee_id = ? AND date BETWEEN ? AND ?
  `).all(emp.id, startDate, endDate);

  let masuk = 0;
  let pulang = 0;
  let telat = 0;
  let cepat = 0;
  let lupa = 0;

  for (const r of records) {
    if (r.clock_in_time) masuk++;
    if (r.clock_out_time) pulang++;
    if (r.clock_in_status === 'terlambat') telat++;
    if (r.clock_out_status === 'pulang_cepat') cepat++;
    if (r.clock_in_time && !r.clock_out_time) lupa++;
  }

  let activeDaysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  try {
    if (emp.work_days) activeDaysList = JSON.parse(emp.work_days);
  } catch {}

  let scheduledWorkDays = 0;
  for (const dateStr of allDatesInRange) {
    const dObj = new Date(`${dateStr}T12:00:00Z`);
    const dayName = INDO_DAYS[dObj.getUTCDay()];
    if (activeDaysList.includes(dayName)) scheduledWorkDays++;
  }

  // Query approved duty/leave days from DB
  const leaveRows = db.prepare(`
    SELECT total_days FROM leave_requests
    WHERE employee_id = ? AND status = 'approved'
      AND start_date <= ? AND end_date >= ?
  `).all(emp.id, endDate, startDate);
  
  let approvedLeaveDays = 0;
  for (const l of leaveRows) {
    approvedLeaveDays += l.total_days || 0;
  }

  const alpha = Math.max(0, scheduledWorkDays - masuk - approvedLeaveDays);
  const predikat = determinePredikat(masuk, pulang, telat, cepat, lupa, alpha, scheduledWorkDays);

  console.log(`${emp.nip} | ${emp.name} | ${emp.dept_name} | Masuk: ${masuk} | Pulang: ${pulang} | Telat: ${telat} | Cepat: ${cepat} | Lupa: ${lupa} | Alpha: ${alpha} | Predikat: ${predikat}`);
}

