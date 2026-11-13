const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

// Let's test calculate recap for 2026-08-01 to 2026-08-25
const startDate = '2026-08-01';
const endDate = '2026-08-25';

// Workdays in period (non-Sundays)
const workDates = [];
for (let d = 1; d <= 25; d++) {
  const dayStr = String(d).padStart(2, '0');
  const dateStr = `2026-08-${dayStr}`;
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  if (dateObj.getUTCDay() !== 0) workDates.push(dateStr);
}
const totalWorkDays = workDates.length;

function getPredikat(masuk, pulang, telat, cepat, lupa, alpha, totalDays) {
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

const employees = db.prepare(`
  SELECT e.id, e.name, e.nip, d.name as dept_name
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  ORDER BY CAST(SUBSTR(e.nip, 6) AS INTEGER) ASC, e.name ASC
`).all();

console.log('Testing recap for employees:', employees.length);

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

  const alpha = Math.max(0, totalWorkDays - masuk);
  const predikat = getPredikat(masuk, pulang, telat, cepat, lupa, alpha, totalWorkDays);

  console.log(`${emp.name} | ${emp.dept_name} | Masuk: ${masuk} | Pulang: ${pulang} | Telat: ${telat} | Cepat: ${cepat} | Lupa: ${lupa} | Alpha: ${alpha} | Predikat: ${predikat}`);
}

