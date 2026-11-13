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

async function run() {
  const users = await sql.query('SELECT id, username, role FROM users WHERE role = $1', ['superadmin']);
  console.log('Superadmins from Neon:', users);
  const emps = await sql.query('SELECT count(*) as count FROM employees');
  console.log('Employees count in Neon:', emps);
}

run().catch(console.error);
