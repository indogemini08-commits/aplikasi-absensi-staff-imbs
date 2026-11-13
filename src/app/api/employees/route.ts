import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');

    const db = getDb();
    let query = `
      SELECT e.*, d.name as department_name, d.code as department_code,
             d.start_time as dept_start_time, d.end_time as dept_end_time,
             d.grace_period_minutes as dept_grace_period, d.work_days as dept_work_days,
             d.daily_schedules as dept_daily_schedules,
             d.break_start as dept_break_start, d.break_end as dept_break_end,
             u.username, u.email, u.role, u.is_active as user_active,
             lb.remaining_days as leave_remaining,
             st.name as shift_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN leave_balances lb ON e.id = lb.employee_id AND lb.year = ?
      LEFT JOIN employee_schedules es ON e.id = es.employee_id
      LEFT JOIN shift_templates st ON es.shift_id = st.id
      WHERE 1=1
    `;
    const params: any[] = [new Date().getFullYear()];

    if (departmentId) {
      query += ` AND e.department_id = ?`;
      params.push(departmentId);
    }

    if (search) {
      query += ` AND (e.name LIKE ? OR e.nip LIKE ? OR u.username LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY CAST(SUBSTR(e.nip, 6) AS INTEGER) ASC, e.name ASC`;
    const rawEmployees = await db.prepare(query).all(...params) as any[];
    const employees = rawEmployees.map((emp) => ({
      ...emp,
      dept_work_days: typeof emp.dept_work_days === 'string' ? JSON.parse(emp.dept_work_days) : (emp.dept_work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']),
      dept_daily_schedules: typeof emp.dept_daily_schedules === 'string' ? JSON.parse(emp.dept_daily_schedules) : emp.dept_daily_schedules,
    }));

    const rawDepartments = await db.prepare(`SELECT * FROM departments ORDER BY name ASC`).all() as any[];
    const departments = rawDepartments.map((d) => ({
      ...d,
      work_days: typeof d.work_days === 'string' ? JSON.parse(d.work_days) : (d.work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']),
      daily_schedules: typeof d.daily_schedules === 'string' ? JSON.parse(d.daily_schedules) : d.daily_schedules,
    }));
    const shifts = await db.prepare(`SELECT * FROM shift_templates ORDER BY name ASC`).all();

    return NextResponse.json({ employees, departments, shifts });
  } catch (err: any) {
    console.error('Employees GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat data pegawai' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Batch CSV Import
    if (action === 'import_csv') {
      const { rows } = body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'Data baris CSV tidak valid' }, { status: 400 });
      }

      let successCount = 0;
      const errors: string[] = [];
      const defaultPasswordHash = hashPassword('password123');
      const defaultDept = await db.prepare(`SELECT id FROM departments LIMIT 1`).get() as any;
      const defaultShift = await db.prepare(`SELECT id FROM shift_templates WHERE is_default = 1 LIMIT 1`).get() as any;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name || !row.nip || !row.username) {
            errors.push(`Baris ${i + 1}: Nama, NIP, dan username wajib diisi`);
            continue;
          }

          const existingUser = await db.prepare(`SELECT id FROM users WHERE username = ? OR email = ?`).get(row.username, row.email || `${row.username}@imbs.sch.id`);
          if (existingUser) {
            errors.push(`Baris ${i + 1} (${row.name}): Username/email sudah digunakan`);
            continue;
          }

          const existingNip = await db.prepare(`SELECT id FROM employees WHERE nip = ?`).get(row.nip);
          if (existingNip) {
            errors.push(`Baris ${i + 1} (${row.name}): NIP sudah terdaftar`);
            continue;
          }

          const userId = `usr-imp-${Date.now()}-${i}`;
          const empId = `emp-imp-${Date.now()}-${i}`;

          await db.prepare(`
            INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'staff', 1, ?, ?)
          `).run(userId, row.username.trim().toLowerCase(), row.email || `${row.username}@imbs.sch.id`, defaultPasswordHash, now, now);

          await db.prepare(`
            INSERT INTO employees (id, user_id, nip, name, gender, phone, department_id, position, join_date, status, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'permanent', 1, ?, ?)
          `).run(
            empId,
            userId,
            row.nip.trim(),
            row.name.trim(),
            row.gender || 'L',
            row.phone || null,
            row.departmentId || defaultDept?.id,
            row.position || 'Staff Pengajar',
            row.joinDate || now.substring(0, 10),
            now,
            now
          );

          // Add leave balance & schedule
          await db.prepare(`
            INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
            VALUES (?, ?, ?, 12, 0, 0, 12, ?)
          `).run(`bal-${empId}`, empId, new Date().getFullYear(), now);

          if (defaultShift) {
            await db.prepare(`
              INSERT INTO employee_schedules (id, employee_id, shift_id, effective_date, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(`sch-${empId}`, empId, defaultShift.id, now.substring(0, 10), now);
          }

          successCount++;
        } catch (e: any) {
          errors.push(`Baris ${i + 1}: ${e.message}`);
        }
      }

      recordAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action: 'IMPORT_EMPLOYEES_CSV',
        entityType: 'employee',
        details: { total: rows.length, successCount, errorCount: errors.length },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({
        success: true,
        message: `Impor data selesai. ${successCount} pegawai berhasil diimpor.${errors.length > 0 ? ` (${errors.length} gagal)` : ''}`,
        successCount,
        errors,
      });
    }

    // 2. Single Employee Add
    const {
      nip,
      name,
      username,
      email,
      password,
      gender,
      phone,
      departmentId,
      position,
      joinDate,
      role,
      shiftId,
    } = body;

    if (!nip || !name || !username || !departmentId || !position) {
      return NextResponse.json(
        { error: 'NIP, nama lengkap, username, divisi, dan jabatan wajib diisi.' },
        { status: 400 }
      );
    }

    // Check unique username & NIP
    const existingUser = await db.prepare(`SELECT id FROM users WHERE username = ? OR email = ?`).get(username.trim().toLowerCase(), email || `${username}@imbs.sch.id`);
    if (existingUser) {
      return NextResponse.json({ error: 'Username atau email sudah digunakan.' }, { status: 400 });
    }

    const existingNip = await db.prepare(`SELECT id FROM employees WHERE nip = ?`).get(nip.trim());
    if (existingNip) {
      return NextResponse.json({ error: 'NIP sudah terdaftar di sistem.' }, { status: 400 });
    }

    const userId = `usr-${Date.now()}`;
    const empId = `emp-${Date.now()}`;
    const passwordHash = hashPassword(password || 'password123');

    await db.exec('BEGIN TRANSACTION;');
    try {
      await db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        userId,
        username.trim().toLowerCase(),
        email || `${username.trim().toLowerCase()}@imbs.sch.id`,
        passwordHash,
        role || 'staff',
        now,
        now
      );

      await db.prepare(`
        INSERT INTO employees (id, user_id, nip, name, gender, phone, department_id, position, join_date, status, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'permanent', 1, ?, ?)
      `).run(
        empId,
        userId,
        nip.trim(),
        name.trim(),
        gender || 'L',
        phone || null,
        departmentId,
        position.trim(),
        joinDate || now.substring(0, 10),
        now,
        now
      );

      // Initialize leave balance
      await db.prepare(`
        INSERT INTO leave_balances (id, employee_id, year, allocated_days, used_days, pending_days, remaining_days, updated_at)
        VALUES (?, ?, ?, 12, 0, 0, 12, ?)
      `).run(`bal-${empId}`, empId, new Date().getFullYear(), now);

      // Assign default shift if provided
      if (shiftId) {
        await db.prepare(`
          INSERT INTO employee_schedules (id, employee_id, shift_id, effective_date, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`sch-${empId}`, empId, shiftId, joinDate || now.substring(0, 10), now);
      }

      await db.exec('COMMIT;');
    } catch (txErr) {
      await db.exec('ROLLBACK;');
      throw txErr;
    }

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CREATE_EMPLOYEE',
      entityType: 'employee',
      entityId: empId,
      details: { nip, name, username, departmentId, position },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Pegawai ${name} (NIP: ${nip}) berhasil ditambahkan. Kata sandi default: password123`,
      empId,
    });
  } catch (err: any) {
    console.error('Employees POST error:', err);
    return NextResponse.json({ error: 'Gagal menambahkan pegawai' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id, // employee id
      name,
      nip,
      gender,
      phone,
      departmentId,
      position,
      isActive,
      resetPassword,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pegawai wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const emp = await db.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as any;
    if (!emp) {
      return NextResponse.json({ error: 'Data pegawai tidak ditemukan' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const activeVal = isActive !== undefined ? (isActive ? 1 : 0) : emp.is_active;

    await db.exec('BEGIN TRANSACTION;');
    try {
      await db.prepare(`
        UPDATE employees SET
          name = COALESCE(?, name),
          nip = COALESCE(?, nip),
          gender = COALESCE(?, gender),
          phone = COALESCE(?, phone),
          department_id = COALESCE(?, department_id),
          position = COALESCE(?, position),
          is_active = ?,
          updated_at = ?
        WHERE id = ?
      `).run(name, nip, gender, phone, departmentId, position, activeVal, now, id);

      // Sync active state to user account
      await db.prepare(`UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?`).run(activeVal, now, emp.user_id);

      // Reset password if requested
      if (resetPassword) {
        const hash = hashPassword(resetPassword);
        await db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(hash, now, emp.user_id);
      }

      await db.exec('COMMIT;');
    } catch (txErr) {
      await db.exec('ROLLBACK;');
      throw txErr;
    }

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'employee',
      entityId: id,
      details: { name, nip, departmentId, position, isActive: activeVal },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Profil pegawai ${name || emp.name} berhasil diperbarui.`,
    });
  } catch (err: any) {
    console.error('Employees PUT error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui data pegawai' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');

    let idsToDelete: string[] = [];
    if (queryId) {
      idsToDelete = [queryId];
    } else {
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        } else if (body.id) {
          idsToDelete = [body.id];
        }
      } catch {
        // no body
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Pilih sekurang-kurangnya satu akun pegawai untuk dihapus' }, { status: 400 });
    }

    const db = getDb();
    let deletedCount = 0;
    const deletedNames: string[] = [];

    for (const empId of idsToDelete) {
      const emp = await db.prepare(`SELECT * FROM employees WHERE id = ?`).get(empId) as any;
      if (!emp) continue;

      deletedNames.push(emp.name);

      // 1. Delete dependent attendance data
      const attRecords = await db.prepare(`SELECT id FROM attendance_records WHERE employee_id = ?`).all(empId) as any[];
      for (const att of attRecords) {
        await db.prepare(`DELETE FROM late_reasons WHERE attendance_id = ?`).run(att.id);
      }
      await db.prepare(`DELETE FROM attendance_records WHERE employee_id = ?`).run(empId);
      await db.prepare(`DELETE FROM attendance_corrections WHERE employee_id = ?`).run(empId);

      // 2. Delete leave data
      await db.prepare(`DELETE FROM leave_requests WHERE employee_id = ?`).run(empId);
      await db.prepare(`DELETE FROM leave_balances WHERE employee_id = ?`).run(empId);

      // 3. Delete schedules & locations
      await db.prepare(`DELETE FROM employee_allowed_locations WHERE employee_id = ?`).run(empId);
      await db.prepare(`DELETE FROM employee_schedules WHERE employee_id = ?`).run(empId);

      // 4. Delete user account notifications and user
      if (emp.user_id) {
        await db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(emp.user_id);
      }

      // 5. Delete employee record
      await db.prepare(`DELETE FROM employees WHERE id = ?`).run(empId);

      // 6. Delete user account
      if (emp.user_id) {
        await db.prepare(`DELETE FROM users WHERE id = ?`).run(emp.user_id);
      }

      deletedCount++;
    }

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'DELETE_EMPLOYEES',
      entityType: 'employee',
      entityId: idsToDelete.join(','),
      details: { count: deletedCount, names: deletedNames, ids: idsToDelete },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${deletedCount} akun pegawai (${deletedNames.slice(0, 3).join(', ')}${deletedNames.length > 3 ? '...' : ''}).`,
      deletedCount,
    });
  } catch (err: any) {
    console.error('Employees DELETE error:', err);
    return NextResponse.json({ error: 'Gagal menghapus data pegawai' }, { status: 500 });
  }
}


