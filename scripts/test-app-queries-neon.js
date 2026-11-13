const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of env.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    break;
  }
}

const sql = neon(dbUrl);

function convertSqlToPostgres(s) {
  let text = s.trim();
  if (/^PRAGMA\s+/i.test(text)) return null;
  text = text.replace(/strftime\s*\(\s*['"]%Y-%m['"]\s*,\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 7)');
  text = text.replace(/strftime\s*\(\s*['"]%Y['"]\s*,\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 4)');
  if (/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(text)) {
    text = text.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ');
    if (!/ON\s+CONFLICT/i.test(text)) text += ' ON CONFLICT DO NOTHING';
  }
  let pIdx = 1;
  text = text.replace(/\?/g, () => `$${pIdx++}`);
  return text;
}

async function query(sqlText, params = []) {
  const converted = convertSqlToPostgres(sqlText);
  if (!converted) return [];
  const rows = await sql.query(converted, params);
  return rows;
}

async function queryOne(sqlText, params = []) {
  const rows = await query(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

async function testAll() {
  console.log('Testing Neon queries...');

  // 1. Departments
  const depts = await query(`
    SELECT d.*,
           (SELECT count(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = 1) as employee_count
    FROM departments d
    ORDER BY d.name ASC
  `);
  console.log('Departments found:', depts.length, 'First dept:', depts[0].name, 'count:', depts[0].employee_count);

  // 2. Employees
  const emps = await query(`
    SELECT e.*, d.name as department_name, d.code as department_code, u.username, u.role
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.is_active = 1
    ORDER BY e.nip ASC
  `);
  console.log('Employees found:', emps.length, 'First employee:', emps[0].name, emps[0].nip);

  // 3. User login query
  const user = await queryOne(`
    SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active,
           e.id as employee_id, e.nip, e.name, e.department_id, e.position,
           d.name as department_name
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
  `, ['superadmin', 'superadmin']);
  console.log('User found:', user ? user.username : null, 'Role:', user ? user.role : null);

  // 4. Attendance query
  const att = await query(`
    SELECT a.*, e.name as employee_name, e.nip, d.name as department_name
    FROM attendance_records a
    JOIN employees e ON a.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE a.date >= ? AND a.date <= ?
    ORDER BY a.date DESC
  `, ['2026-08-01', '2026-08-25']);
  console.log('Attendance records found for Aug 2026:', att.length);

  // 5. Locations
  const locs = await query('SELECT * FROM work_locations WHERE is_active = 1');
  console.log('Locations found:', locs.length, locs[0].name);

  console.log('=== All Neon queries executed successfully! ===');
}

testAll().catch(console.error);
