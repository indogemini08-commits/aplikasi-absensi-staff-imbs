import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import bcrypt from 'bcryptjs';

function getDatabaseUrl() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      return line.trim().substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function run() {
  const url = getDatabaseUrl();
  const sql = neon(url);

  // 1. Get all departments
  const depts = await sql`SELECT id, name, code FROM departments`;
  console.log('Available departments:', depts);

  // 2. Get default shift
  const shifts = await sql`SELECT id FROM shift_templates WHERE is_default = 1 LIMIT 1`;
  const defaultShiftId = shifts[0]?.id || 'shift-1';

  // 3. Fix double emails in users table
  await sql`
    UPDATE users 
    SET email = REPLACE(email, '@imbs.sch@imbs.sch.id', '@imbs.sch')
    WHERE email LIKE '%@imbs.sch@imbs.sch.id%'
  `;
  console.log('Cleaned up double @imbs.sch emails');

  // 4. Fix Aldri's NIP from IMBS-0013 to IMBS-013 if exists
  await sql`
    UPDATE employees
    SET nip = 'IMBS-013'
    WHERE nip = 'IMBS-0013'
  `;
  console.log('Normalized IMBS-0013 to IMBS-013');

  // 5. Missing staff list to ensure all 22 IMBS staff exist
  const missingStaff = [
    {
      nip: 'IMBS-011',
      name: 'Ustadz Hanip Fauzan, S.Ag',
      username: 'hanip@imbs.sch',
      email: 'hanip@imbs.sch',
      deptName: 'Muhafizh',
      position: 'Muhafizh',
      gender: 'L',
    },
    {
      nip: 'IMBS-014',
      name: 'Ustadz Rendi Herliandi, S.Ag',
      username: 'rendi@imbs.sch',
      email: 'rendi@imbs.sch',
      deptName: 'Kepala Asrama',
      position: 'Kepala Asrama',
      gender: 'L',
    },
    {
      nip: 'IMBS-015',
      name: 'Ustadz Ahmadi Sipa, S.H',
      username: 'sipa@imbs.sch',
      email: 'sipa@imbs.sch',
      deptName: 'Kepala Asrama',
      position: 'Kepala Asrama',
      gender: 'L',
    },
    {
      nip: 'IMBS-016',
      name: 'Ustadz Rama Nurmawijaya',
      username: 'rama@imbs.sch',
      email: 'rama@imbs.sch',
      deptName: 'Kepala Asrama',
      position: 'Kepala Asrama',
      gender: 'L',
    },
    {
      nip: 'IMBS-017',
      name: 'Ustadz Ramdhan',
      username: 'ramdhan@imbs.sch',
      email: 'ramdhan@imbs.sch',
      deptName: 'Scurity',
      position: 'Security',
      gender: 'L',
    },
    {
      nip: 'IMBS-018',
      name: 'Pak Abbia Sultan',
      username: 'abbia@imbs.sch',
      email: 'abbia@imbs.sch',
      deptName: 'Scurity',
      position: 'Security',
      gender: 'L',
    },
    {
      nip: 'IMBS-019',
      name: 'Pak Amri',
      username: 'amri@imbs.sch',
      email: 'amri@imbs.sch',
      deptName: 'Office Boy',
      position: 'Office Boy',
      gender: 'L',
    },
    {
      nip: 'IMBS-020',
      name: 'Pak Iwan',
      username: 'iwan@imbs.sch',
      email: 'iwan@imbs.sch',
      deptName: 'Office Boy',
      position: 'Office Boy',
      gender: 'L',
    },
    {
      nip: 'IMBS-021',
      name: 'Ibu Anna',
      username: 'anna@imbs.sch',
      email: 'anna@imbs.sch',
      deptName: 'Juru Masak',
      position: 'Juru Masak',
      gender: 'P',
    },
    {
      nip: 'IMBS-022',
      name: 'Ibu Santi',
      username: 'santi@imbs.sch',
      email: 'santi@imbs.sch',
      deptName: 'Juru Masak',
      position: 'Juru Masak',
      gender: 'P',
    },
  ];

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  for (const s of missingStaff) {
    const dept = depts.find(d => d.name.toLowerCase() === s.deptName.toLowerCase() || d.name.toLowerCase().includes(s.deptName.toLowerCase()));
    if (!dept) {
      console.warn(`Dept not found for ${s.name} (${s.deptName})`);
      continue;
    }

    // Check if user exists
    let existingUser = await sql`SELECT id FROM users WHERE username = ${s.username} OR email = ${s.email}`;
    let userId = existingUser[0]?.id;

    if (!userId) {
      userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await sql`
        INSERT INTO users (id, username, email, password_hash, role, is_active, needs_password_change, created_at, updated_at)
        VALUES (${userId}, ${s.username}, ${s.email}, ${passwordHash}, 'staff', 1, 1, ${now}, ${now})
        ON CONFLICT (username) DO NOTHING
      `;
      console.log(`Created user: ${s.username}`);
    }

    // Check if employee exists
    let existingEmp = await sql`SELECT id FROM employees WHERE nip = ${s.nip} OR user_id = ${userId}`;
    let empId = existingEmp[0]?.id;

    if (!empId) {
      empId = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await sql`
        INSERT INTO employees (id, user_id, nip, name, gender, department_id, position, join_date, status, is_active, created_at, updated_at)
        VALUES (${empId}, ${userId}, ${s.nip}, ${s.name}, ${s.gender}, ${dept.id}, ${s.position}, '2026-01-01', 'permanent', 1, ${now}, ${now})
        ON CONFLICT (nip) DO NOTHING
      `;
      console.log(`Created employee: ${s.name} (${s.nip}) in dept ${dept.name}`);

      // Add leave balance
      await sql`
        INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
        VALUES (${`bal-${empId}`}, ${empId}, ${year}, 12, 0, 0, 12, ${now})
        ON CONFLICT (id) DO NOTHING
      `;

      // Add shift schedule
      if (defaultShiftId) {
        await sql`
          INSERT INTO employee_schedules (id, employee_id, shift_id, effective_date, created_at)
          VALUES (${`sch-${empId}`}, ${empId}, ${defaultShiftId}, '2026-01-01', ${now})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    } else {
      console.log(`Employee ${s.name} (${s.nip}) already exists`);
    }
  }

  // 6. Verify final list of employees in Neon
  const finalEmps = await sql`
    SELECT e.nip, e.name, d.name as department_name, u.username, u.email, e.is_active
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY e.nip ASC
  `;
  console.log(`\n=== Final count of employees in Neon: ${finalEmps.length} ===`);
  for (const fe of finalEmps) {
    console.log(`${fe.nip} | ${fe.name} | ${fe.department_name} | @${fe.username} | ${fe.email}`);
  }
}

run().catch(console.error);
