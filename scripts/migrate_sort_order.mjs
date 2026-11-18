import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { DatabaseSync } from 'node:sqlite';

let dbUrl = '';
try {
  const env = fs.readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
    }
  }
} catch (e) {}

console.log('Connecting to Neon...');
if (dbUrl) {
  const sql = neon(dbUrl);
  try {
    // 1. Add sort_order column to Neon PostgreSQL if not exists
    await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`;
    console.log('Neon: sort_order column ensured.');

    // 2. Fetch all employees to check current sort_order values
    const employees = await sql`SELECT id, nip, name, sort_order FROM employees ORDER BY nip ASC`;
    console.log(`Neon: Found ${employees.length} employees.`);
    
    // If all sort_order are 0, initialize them sequentially 1..N based on natural NIP sorting
    const allZero = employees.every(e => !e.sort_order || e.sort_order === 0);
    if (allZero) {
      console.log('Initializing sort_order sequentially based on natural NIP order...');
      for (let i = 0; i < employees.length; i++) {
        await sql`UPDATE employees SET sort_order = ${i + 1} WHERE id = ${employees[i].id}`;
      }
      console.log('Neon: Initialized sort_order 1..' + employees.length);
    }
  } catch (err) {
    console.error('Neon migration error:', err);
  }
}

// Also update local SQLite database
try {
  const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
  if (fs.existsSync(dbPath)) {
    const sqlite = new DatabaseSync(dbPath);
    try {
      sqlite.exec('ALTER TABLE employees ADD COLUMN sort_order INTEGER DEFAULT 0;');
      console.log('SQLite: sort_order column added.');
    } catch (e) {
      console.log('SQLite: column might already exist:', e.message);
    }

    const rows = sqlite.prepare('SELECT id, nip, name, sort_order FROM employees ORDER BY nip ASC').all();
    const allZero = rows.every(r => !r.sort_order || r.sort_order === 0);
    if (allZero) {
      for (let i = 0; i < rows.length; i++) {
        sqlite.prepare('UPDATE employees SET sort_order = ? WHERE id = ?').run(i + 1, rows[i].id);
      }
      console.log('SQLite: Initialized sort_order 1..' + rows.length);
    }
  }
} catch (err) {
  console.error('SQLite migration error:', err);
}
