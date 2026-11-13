const { DatabaseSync } = require('node:sqlite');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
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
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(dbUrl);
const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
const sqlite = new DatabaseSync(dbPath);

async function migrate() {
  console.log('Migrating SQLite tables & real IMBS data to Neon PostgreSQL...');

  // 1. Create tables in Postgres
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      manager_name TEXT,
      start_time TEXT NOT NULL DEFAULT '07:30',
      end_time TEXT NOT NULL DEFAULT '16:00',
      grace_period_minutes INTEGER NOT NULL DEFAULT 10,
      work_days TEXT NOT NULL DEFAULT '["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"]',
      daily_schedules TEXT,
      break_start TEXT DEFAULT '12:00',
      break_end TEXT DEFAULT '13:00'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      nip TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      gender TEXT,
      phone TEXT,
      department_id TEXT NOT NULL,
      position TEXT NOT NULL,
      join_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'permanent',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS work_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      radius_meters INTEGER NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employee_allowed_locations (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      UNIQUE(employee_id, location_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shift_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      grace_period_minutes INTEGER NOT NULL DEFAULT 10,
      break_start TEXT,
      break_end TEXT,
      work_days TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employee_schedules (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      shift_id TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      clock_in_time TEXT,
      clock_in_latitude DOUBLE PRECISION,
      clock_in_longitude DOUBLE PRECISION,
      clock_in_accuracy DOUBLE PRECISION,
      clock_in_distance_meters DOUBLE PRECISION,
      clock_in_location_id TEXT,
      clock_in_photo TEXT,
      clock_in_status TEXT,
      clock_in_minutes_late INTEGER DEFAULT 0,
      clock_out_time TEXT,
      clock_out_latitude DOUBLE PRECISION,
      clock_out_longitude DOUBLE PRECISION,
      clock_out_accuracy DOUBLE PRECISION,
      clock_out_distance_meters DOUBLE PRECISION,
      clock_out_location_id TEXT,
      clock_out_photo TEXT,
      clock_out_status TEXT,
      shift_id TEXT,
      device_info TEXT,
      is_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(employee_id, date)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS late_reasons (
      id TEXT PRIMARY KEY,
      attendance_id TEXT UNIQUE NOT NULL,
      employee_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      admin_notes TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leave_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      deducts_leave_balance INTEGER NOT NULL DEFAULT 0,
      requires_attachment INTEGER NOT NULL DEFAULT 0,
      max_days INTEGER DEFAULT 12,
      description TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT,
      emergency_contact TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      allocated_days INTEGER NOT NULL DEFAULT 12,
      used_days INTEGER NOT NULL DEFAULT 0,
      pending_days INTEGER NOT NULL DEFAULT 0,
      remaining_days INTEGER NOT NULL DEFAULT 12,
      updated_at TEXT NOT NULL,
      UNIQUE(employee_id, year)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'national',
      description TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_corrections (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      attendance_id TEXT,
      date TEXT NOT NULL,
      correction_type TEXT NOT NULL,
      corrected_clock_in TEXT,
      corrected_clock_out TEXT,
      reason TEXT NOT NULL,
      proof_attachment TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      reference_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );
  `;

  console.log('Postgres tables created successfully!');

  // 2. Transfer data from SQLite to Neon
  // Settings
  const settings = sqlite.prepare('SELECT * FROM app_settings').all();
  for (const s of settings) {
    await sql`
      INSERT INTO app_settings (key, value, description)
      VALUES (${s.key}, ${s.value}, ${s.description})
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value;
    `;
  }
  console.log('Settings migrated:', settings.length);

  // Departments
  const depts = sqlite.prepare('SELECT * FROM departments').all();
  for (const d of depts) {
    await sql`
      INSERT INTO departments (id, name, code, description, manager_name, start_time, end_time, grace_period_minutes, work_days, daily_schedules, break_start, break_end)
      VALUES (${d.id}, ${d.name}, ${d.code}, ${d.description}, ${d.manager_name}, ${d.start_time}, ${d.end_time}, ${d.grace_period_minutes}, ${d.work_days}, ${d.daily_schedules}, ${d.break_start}, ${d.break_end})
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        work_days = EXCLUDED.work_days,
        daily_schedules = EXCLUDED.daily_schedules;
    `;
  }
  console.log('Departments migrated:', depts.length);

  // Locations
  const locs = sqlite.prepare('SELECT * FROM work_locations').all();
  for (const l of locs) {
    await sql`
      INSERT INTO work_locations (id, name, address, latitude, longitude, radius_meters, is_active, created_at)
      VALUES (${l.id}, ${l.name}, ${l.address}, ${l.latitude}, ${l.longitude}, ${l.radius_meters}, ${l.is_active}, ${l.created_at})
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;
    `;
  }
  console.log('Locations migrated:', locs.length);

  // Users
  const users = sqlite.prepare('SELECT * FROM users').all();
  for (const u of users) {
    await sql`
      INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (${u.id}, ${u.username}, ${u.email}, ${u.password_hash}, ${u.role}, ${u.is_active}, ${u.created_at}, ${u.updated_at})
      ON CONFLICT(id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role;
    `;
  }
  console.log('Users migrated:', users.length);

  // Employees
  const emps = sqlite.prepare('SELECT * FROM employees').all();
  for (const e of emps) {
    await sql`
      INSERT INTO employees (id, user_id, nip, name, avatar_url, gender, phone, department_id, position, join_date, status, is_active, created_at, updated_at)
      VALUES (${e.id}, ${e.user_id}, ${e.nip}, ${e.name}, ${e.avatar_url}, ${e.gender}, ${e.phone}, ${e.department_id}, ${e.position}, ${e.join_date}, ${e.status}, ${e.is_active}, ${e.created_at}, ${e.updated_at})
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        nip = EXCLUDED.nip,
        department_id = EXCLUDED.department_id,
        position = EXCLUDED.position;
    `;
  }
  console.log('Employees migrated:', emps.length);

  // Leave types
  const leaveTypes = sqlite.prepare('SELECT * FROM leave_types').all();
  for (const lt of leaveTypes) {
    await sql`
      INSERT INTO leave_types (id, name, code, deducts_leave_balance, requires_attachment, max_days, description)
      VALUES (${lt.id}, ${lt.name}, ${lt.code}, ${lt.deducts_leave_balance}, ${lt.requires_attachment}, ${lt.max_days}, ${lt.description})
      ON CONFLICT(id) DO NOTHING;
    `;
  }
  console.log('Leave types migrated:', leaveTypes.length);

  // Leave requests
  const leaveRequests = sqlite.prepare('SELECT * FROM leave_requests').all();
  for (const lr of leaveRequests) {
    await sql`
      INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url, emergency_contact, status, approved_by, approved_at, rejection_reason, created_at)
      VALUES (${lr.id}, ${lr.employee_id}, ${lr.leave_type_id}, ${lr.start_date}, ${lr.end_date}, ${lr.total_days}, ${lr.reason}, ${lr.attachment_url}, ${lr.emergency_contact}, ${lr.status}, ${lr.approved_by}, ${lr.approved_at}, ${lr.rejection_reason}, ${lr.created_at})
      ON CONFLICT(id) DO NOTHING;
    `;
  }
  console.log('Leave requests migrated:', leaveRequests.length);

  // Leave balances
  const leaveBalances = sqlite.prepare('SELECT * FROM leave_balances').all();
  for (const lb of leaveBalances) {
    await sql`
      INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
      VALUES (${lb.id}, ${lb.employee_id}, ${lb.year}, ${lb.allocated_days}, ${lb.used_days}, ${lb.pending_days}, ${lb.remaining_days}, ${lb.updated_at})
      ON CONFLICT(id) DO NOTHING;
    `;
  }
  console.log('Leave balances migrated:', leaveBalances.length);

  // Attendance records (August 2026)
  const attRecords = sqlite.prepare('SELECT * FROM attendance_records').all();
  for (const a of attRecords) {
    await sql`
      INSERT INTO attendance_records (
        id, employee_id, date, clock_in_time, clock_in_latitude, clock_in_longitude,
        clock_in_accuracy, clock_in_distance_meters, clock_in_location_id, clock_in_status,
        clock_in_minutes_late, clock_out_time, clock_out_latitude, clock_out_longitude,
        clock_out_accuracy, clock_out_distance_meters, clock_out_location_id, clock_out_status,
        shift_id, is_verified, created_at, updated_at
      ) VALUES (
        ${a.id}, ${a.employee_id}, ${a.date}, ${a.clock_in_time}, ${a.clock_in_latitude}, ${a.clock_in_longitude},
        ${a.clock_in_accuracy}, ${a.clock_in_distance_meters}, ${a.clock_in_location_id}, ${a.clock_in_status},
        ${a.clock_in_minutes_late}, ${a.clock_out_time}, ${a.clock_out_latitude}, ${a.clock_out_longitude},
        ${a.clock_out_accuracy}, ${a.clock_out_distance_meters}, ${a.clock_out_location_id}, ${a.clock_out_status},
        ${a.shift_id}, ${a.is_verified}, ${a.created_at}, ${a.updated_at}
      )
      ON CONFLICT(id) DO UPDATE SET
        clock_in_time = EXCLUDED.clock_in_time,
        clock_in_status = EXCLUDED.clock_in_status,
        clock_out_time = EXCLUDED.clock_out_time,
        clock_out_status = EXCLUDED.clock_out_status;
    `;
  }
  console.log('Attendance records migrated:', attRecords.length);

  // Audit logs
  const auditLogs = sqlite.prepare('SELECT * FROM audit_logs').all();
  for (const aud of auditLogs) {
    await sql`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (${aud.id}, ${aud.user_id}, ${aud.user_name}, ${aud.action}, ${aud.entity_type}, ${aud.entity_id}, ${aud.details}, ${aud.ip_address}, ${aud.created_at})
      ON CONFLICT(id) DO NOTHING;
    `;
  }
  console.log('Audit logs migrated:', auditLogs.length);

  // Notifications
  const notifs = sqlite.prepare('SELECT * FROM notifications').all();
  for (const n of notifs) {
    await sql`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id, is_read, created_at)
      VALUES (${n.id}, ${n.user_id}, ${n.title}, ${n.message}, ${n.type}, ${n.reference_id}, ${n.is_read}, ${n.created_at})
      ON CONFLICT(id) DO NOTHING;
    `;
  }
  console.log('Notifications migrated:', notifs.length);

  console.log('=== Neon PostgreSQL Migration Complete & 100% Synced! ===');
}

migrate().catch(console.error);
