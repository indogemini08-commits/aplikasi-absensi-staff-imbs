const fs = require('fs');
const { neon } = require('@neondatabase/serverless');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const env = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of env.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    break;
  }
}
const sql = neon(dbUrl);
const sqlite = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

async function syncAll() {
  console.log('=== SYNCING EMPLOYEES & USERS IN SQLITE ===');

  // Fix user_id in employees table to match users table: emp-imbs-X -> user-imbs-X
  sqlite.exec(`
    UPDATE employees
    SET user_id = 'user-imbs-' || SUBSTR(id, 10)
    WHERE id LIKE 'emp-imbs-%';
  `);

  // Verify JOIN in SQLite
  const sqliteJoined = sqlite.prepare(`
    SELECT e.id, e.name, e.nip, e.position, d.name as dept_name, u.username, u.role
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.is_active = 1
    ORDER BY CAST(SUBSTR(e.nip, 6) AS INTEGER) ASC
  `).all();
  console.log('SQLite synchronized employees count:', sqliteJoined.length);
  console.log('Sample row SQLite:', sqliteJoined[0]);

  console.log('\n=== SYNCING EMPLOYEES & USERS IN NEON POSTGRESQL ===');
  await sql.query(`
    UPDATE employees
    SET user_id = 'user-imbs-' || SUBSTR(id, 10)
    WHERE id LIKE 'emp-imbs-%';
  `);

  const neonJoined = await sql.query(`
    SELECT e.id, e.name, e.nip, e.position, d.name as dept_name, u.username, u.role
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.is_active = 1
    ORDER BY CAST(SUBSTR(e.nip, 6) AS INTEGER) ASC
  `);
  console.log('Neon synchronized employees count:', neonJoined.length);
  console.log('Sample row Neon:', neonJoined[0]);

  // Ensure leave_balances are synchronized for all 22 employees for 2026
  console.log('\n=== VERIFYING LEAVE BALANCES ===');
  for (const emp of sqliteJoined) {
    sqlite.exec(`
      INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
      VALUES ('bal-${emp.id}', '${emp.id}', 2026, 12, 0, 0, 12, datetime('now'))
      ON CONFLICT(employee_id, year) DO NOTHING;
    `);

    await sql.query(`
      INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
      VALUES ($1, $2, 2026, 12, 0, 0, 12, NOW()::text)
      ON CONFLICT(employee_id, year) DO NOTHING;
    `, [`bal-${emp.id}`, emp.id]);
  }

  const lbCountSqlite = sqlite.prepare('SELECT count(*) as count FROM leave_balances WHERE year = 2026').get();
  console.log('SQLite leave_balances count:', lbCountSqlite.count);
  const lbCountNeon = await sql.query('SELECT count(*) as count FROM leave_balances WHERE year = 2026');
  console.log('Neon leave_balances count:', lbCountNeon[0].count);

  console.log('\n=== SYNC COMPLETE! ===');
}

syncAll().catch(console.error);
