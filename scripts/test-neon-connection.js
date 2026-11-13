const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

// Read DATABASE_URL from .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    break;
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

async function test() {
  console.log('Connecting to Neon PostgreSQL...');
  const res = await sql`SELECT NOW() as current_time, version() as pg_version`;
  console.log('Neon connected successfully!');
  console.log('Current time:', res[0].current_time);
  console.log('Postgres version:', res[0].pg_version);
}

test().catch(console.error);

