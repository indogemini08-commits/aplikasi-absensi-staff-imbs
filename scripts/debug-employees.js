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

async function check() {
  console.log('=== CHECKING SQLITE ===');
  const sqliteEmps = sqlite.prepare('SELECT id, user_id, nip, name, department_id FROM employees').all();
  console.log('SQLite employees count:', sqliteEmps.length);
  const sqliteJoin = sqlite.prepare(`
    SELECT e.id, e.name, d.name as dept_name, u.username
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN users u ON e.user_id = u.id
  `).all();
  console.log('SQLite employees JOIN count:', sqliteJoin.length);

  console.log('\n=== CHECKING NEON POSTGRES ===');
  const neonEmps = await sql.query('SELECT id, user_id, nip, name, department_id FROM employees');
  console.log('Neon employees count:', neonEmps.length);
  const neonJoin = await sql.query(`
    SELECT e.id, e.name, d.name as dept_name, u.username
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN users u ON e.user_id = u.id
  `);
  console.log('Neon employees JOIN count:', neonJoin.length);

  if (neonJoin.length === 0 && neonEmps.length > 0) {
    console.log('Sample Neon emp:', neonEmps[0]);
    const u = await sql.query('SELECT * FROM users WHERE id = $1', [neonEmps[0].user_id]);
    console.log('Sample user lookup:', u);
    const d = await sql.query('SELECT * FROM departments WHERE id = $1', [neonEmps[0].department_id]);
    console.log('Sample dept lookup:', d);
  }
}

check().catch(console.error);

