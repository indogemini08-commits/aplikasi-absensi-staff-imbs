import { DatabaseSync } from 'node:sqlite';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      return line.trim().substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function syncToSqlite() {
  const url = getDatabaseUrl();
  const sql = neon(url);
  const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
  const db = new DatabaseSync(dbPath);

  console.log('Fetching users, departments, employees, leave_balances from Neon...');
  const [users, depts, emps, balances, schedules] = await Promise.all([
    sql`SELECT * FROM users`,
    sql`SELECT * FROM departments`,
    sql`SELECT * FROM employees`,
    sql`SELECT * FROM leave_balances`,
    sql`SELECT * FROM employee_schedules`,
  ]);

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM departments;');
  db.exec('DELETE FROM employees;');
  db.exec('DELETE FROM users;');

  // Sync users
  const upsertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, is_active, needs_password_change, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      email = excluded.email,
      password_hash = excluded.password_hash,
      role = excluded.role,
      is_active = excluded.is_active,
      needs_password_change = excluded.needs_password_change
  `);
  for (const u of users) {
    upsertUser.run(u.id, u.username, u.email, u.password_hash, u.role, u.is_active, u.needs_password_change || 0, u.created_at, u.updated_at);
  }

  // Sync departments
  const upsertDept = db.prepare(`
    INSERT INTO departments (id, name, code, description, manager_name, start_time, end_time, grace_period_minutes, work_days, break_start, break_end, daily_schedules)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      code = excluded.code,
      description = excluded.description,
      manager_name = excluded.manager_name,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      grace_period_minutes = excluded.grace_period_minutes,
      work_days = excluded.work_days,
      break_start = excluded.break_start,
      break_end = excluded.break_end,
      daily_schedules = excluded.daily_schedules
  `);
  for (const d of depts) {
    upsertDept.run(
      d.id, d.name, d.code, d.description || '', d.manager_name || null,
      d.start_time || '07:30', d.end_time || '16:00',
      d.grace_period_minutes || 10,
      typeof d.work_days === 'object' ? JSON.stringify(d.work_days) : d.work_days,
      d.break_start || '12:00', d.break_end || '13:00',
      typeof d.daily_schedules === 'object' ? JSON.stringify(d.daily_schedules) : d.daily_schedules
    );
  }

  // Sync employees
  const upsertEmp = db.prepare(`
    INSERT INTO employees (id, user_id, nip, name, gender, phone, department_id, position, join_date, status, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      nip = excluded.nip,
      name = excluded.name,
      gender = excluded.gender,
      department_id = excluded.department_id,
      position = excluded.position,
      is_active = excluded.is_active
  `);
  for (const e of emps) {
    upsertEmp.run(
      e.id, e.user_id, e.nip, e.name, e.gender || 'L', e.phone || null,
      e.department_id, e.position, e.join_date || '2026-01-01',
      e.status || 'permanent', e.is_active,
      e.created_at, e.updated_at
    );
  }

  // Sync balances
  const upsertBal = db.prepare(`
    INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      remaining_days = excluded.remaining_days
  `);
  for (const b of balances) {
    upsertBal.run(b.id, b.employee_id, b.year, b.allocated_days, b.used_days, b.pending_days, b.remaining_days, b.updated_at);
  }

  // Sync schedules
  const upsertSch = db.prepare(`
    INSERT INTO employee_schedules (id, employee_id, shift_id, effective_date, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      shift_id = excluded.shift_id
  `);
  for (const s of schedules) {
    upsertSch.run(s.id, s.employee_id, s.shift_id, s.effective_date, s.created_at);
  }

  db.exec('PRAGMA foreign_keys = ON;');
  console.log(`Synced to SQLite: ${users.length} users, ${depts.length} departments, ${emps.length} employees`);
}

syncToSqlite().catch(console.error);
