const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const sqlite = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

const employees = sqlite.prepare(`
  SELECT e.*, d.name as department_name, d.code as department_code,
         u.username, u.email, u.role, u.is_active as user_active,
         lb.remaining_days as leave_remaining
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN users u ON e.user_id = u.id
  LEFT JOIN leave_balances lb ON e.id = lb.employee_id AND lb.year = 2026
  WHERE 1=1
  ORDER BY CAST(SUBSTR(e.nip, 6) AS INTEGER) ASC
`).all();

console.log('Employees found:', employees.length);
console.log('First employee:', employees[0].nip, employees[0].name, 'Dept:', employees[0].department_name, 'Username:', employees[0].username, 'Leave:', employees[0].leave_remaining);
console.log('Last employee:', employees[21].nip, employees[21].name, 'Dept:', employees[21].department_name, 'Username:', employees[21].username, 'Leave:', employees[21].leave_remaining);
