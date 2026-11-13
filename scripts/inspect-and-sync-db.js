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

async function inspect() {
  console.log('=== SQLITE EMPLOYEES ===');
  const emps = sqlite.prepare('SELECT id, user_id, nip, name, department_id FROM employees').all();
  console.log('Count:', emps.length);
  for (const e of emps.slice(0, 5)) {
    console.log(`emp id: ${e.id}, user_id: ${e.user_id}, nip: ${e.nip}, name: ${e.name}`);
  }

  console.log('\n=== SQLITE USERS ===');
  const users = sqlite.prepare('SELECT id, username, role FROM users').all();
  console.log('Count:', users.length);
  for (const u of users.slice(0, 8)) {
    console.log(`user id: ${u.id}, username: ${u.username}, role: ${u.role}`);
  }

  console.log('\n=== NEON EMPLOYEES ===');
  const neonEmps = await sql.query('SELECT id, user_id, nip, name, department_id FROM employees');
  console.log('Neon emps count:', neonEmps.length);
  for (const e of neonEmps.slice(0, 5)) {
    console.log(`emp id: ${e.id}, user_id: ${e.user_id}, nip: ${e.nip}, name: ${e.name}`);
  }

  console.log('\n=== NEON USERS ===');
  const neonUsers = await sql.query('SELECT id, username, role FROM users');
  console.log('Neon users count:', neonUsers.length);
  for (const u of neonUsers.slice(0, 8)) {
    console.log(`user id: ${u.id}, username: ${u.username}, role: ${u.role}`);
  }
}

inspect().catch(console.error);
