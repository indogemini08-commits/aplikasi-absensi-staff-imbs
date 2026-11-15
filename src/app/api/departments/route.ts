import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function buildFallbackDailySchedules(
  workDays: string[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  startTime: string = '07:30',
  endTime: string = '16:00'
) {
  const result: Record<string, any> = {};
  for (const day of ALL_DAYS) {
    const isWork = workDays.includes(day);
    result[day] = {
      isActive: isWork,
      startTime: isWork ? (startTime || '07:30') : '07:30',
      endTime: isWork ? (day === 'Jumat' && endTime === '16:00' ? '11:30' : (endTime || '16:00')) : '16:00',
    };
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const db = getDb();
    const departments = await db.prepare(`
      SELECT d.*,
             (SELECT count(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = 1) as employee_count
      FROM departments d
      ORDER BY d.name ASC
    `).all() as any[];

    const formatted = departments.map((d) => {
      let dailySchedules = null;
      if (d.daily_schedules) {
        try {
          dailySchedules = typeof d.daily_schedules === 'string' ? JSON.parse(d.daily_schedules) : d.daily_schedules;
        } catch {
          dailySchedules = null;
        }
      }

      const parsedWorkDays: string[] = typeof d.work_days === 'string'
        ? JSON.parse(d.work_days)
        : (d.work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);

      if (!dailySchedules || typeof dailySchedules !== 'object') {
        dailySchedules = buildFallbackDailySchedules(
          parsedWorkDays,
          d.start_time,
          d.end_time
        );
      }

      // Re-derive active work days from dailySchedules for absolute consistency
      const activeDays = Object.entries(dailySchedules)
        .filter(([_, cfg]: [string, any]) => cfg.isActive)
        .map(([day]) => day);

      return {
        ...d,
        daily_schedules: dailySchedules,
        work_days: activeDays.length > 0 ? activeDays : parsedWorkDays,
      };
    });

    return NextResponse.json({ departments: formatted });
  } catch (err: any) {
    console.error('Departments GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat jadwal departemen' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      code,
      description,
      managerName,
      gracePeriodMinutes,
      dailySchedules,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Nama departemen dan kode singkatan wajib diisi' },
        { status: 400 }
      );
    }

    const db = getDb();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    // Check duplicate code or name
    const existing = await db.prepare(`SELECT id FROM departments WHERE UPPER(code) = ? OR LOWER(name) = ?`).get(trimmedCode, trimmedName.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { error: `Departemen dengan kode ${trimmedCode} atau nama "${trimmedName}" sudah ada.` },
        { status: 400 }
      );
    }

    const schedulesObj = dailySchedules && typeof dailySchedules === 'object'
      ? dailySchedules
      : buildFallbackDailySchedules(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);

    // Derive active work days and primary start/end times
    const activeDays = Object.entries(schedulesObj)
      .filter(([_, cfg]: [string, any]) => cfg.isActive)
      .map(([day]) => day);

    const firstActiveDay = activeDays[0] || 'Senin';
    const primaryStart = schedulesObj[firstActiveDay]?.startTime || '07:30';
    const primaryEnd = schedulesObj[firstActiveDay]?.endTime || '16:00';
    const primaryBreakStart = schedulesObj[firstActiveDay]?.breakStart || '12:00';
    const primaryBreakEnd = schedulesObj[firstActiveDay]?.breakEnd || '13:00';

    const newId = `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const grace = gracePeriodMinutes !== undefined && gracePeriodMinutes !== null ? parseInt(gracePeriodMinutes, 10) : 10;

    await db.prepare(`
      INSERT INTO departments (
        id, name, code, description, manager_name,
        start_time, end_time, grace_period_minutes,
        work_days, daily_schedules, break_start, break_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      trimmedName,
      trimmedCode,
      description || null,
      managerName || null,
      primaryStart,
      primaryEnd,
      grace,
      JSON.stringify(activeDays),
      JSON.stringify(schedulesObj),
      primaryBreakStart,
      primaryBreakEnd
    );

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CREATE_DEPARTMENT',
      entityType: 'department',
      entityId: newId,
      details: {
        departmentName: trimmedName,
        code: trimmedCode,
        activeDaysCount: activeDays.length,
        gracePeriodMinutes: grace,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Departemen baru "${trimmedName}" (${trimmedCode}) berhasil ditambahkan beserta konfigurasi jadwal hariannya.`,
      departmentId: newId,
    });
  } catch (err: any) {
    console.error('Departments POST error:', err);
    return NextResponse.json({ error: 'Gagal menambahkan departemen' }, { status: 500 });
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
      id,
      name,
      code,
      managerName,
      manager_name,
      description,
      gracePeriodMinutes,
      dailySchedules,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID departemen wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const current = await db.prepare(`SELECT * FROM departments WHERE id = ?`).get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Departemen tidak ditemukan' }, { status: 404 });
    }

    const targetName = name !== undefined ? name.trim() : current.name;
    const targetCode = code !== undefined ? code.trim().toUpperCase() : current.code;

    if (!targetName || !targetCode) {
      return NextResponse.json(
        { error: 'Nama departemen dan kode singkatan tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Check duplicate code or name excluding current department
    const duplicate = await db.prepare(`
      SELECT id FROM departments
      WHERE (UPPER(code) = ? OR LOWER(name) = ?) AND id != ?
    `).get(targetCode, targetName.toLowerCase(), id);

    if (duplicate) {
      return NextResponse.json(
        { error: `Departemen dengan kode "${targetCode}" atau nama "${targetName}" sudah digunakan oleh divisi lain.` },
        { status: 400 }
      );
    }

    const targetManagerName = managerName !== undefined
      ? (managerName ? managerName.trim() : null)
      : (manager_name !== undefined ? (manager_name ? manager_name.trim() : null) : current.manager_name);

    const targetDescription = description !== undefined
      ? (description ? description.trim() : null)
      : current.description;

    const targetGrace = gracePeriodMinutes !== undefined && gracePeriodMinutes !== null
      ? parseInt(gracePeriodMinutes, 10)
      : (current.grace_period_minutes ?? 10);

    let targetDailySchedulesJson = current.daily_schedules;
    let targetWorkDaysJson = current.work_days;
    let targetStartTime = current.start_time || '07:30';
    let targetEndTime = current.end_time || '16:00';
    let targetBreakStart = current.break_start || null;
    let targetBreakEnd = current.break_end || null;
    let activeDays: string[] = [];

    if (dailySchedules && typeof dailySchedules === 'object') {
      activeDays = Object.entries(dailySchedules)
        .filter(([_, cfg]: [string, any]) => cfg.isActive)
        .map(([day]) => day);

      const firstActiveDay = activeDays[0] || 'Senin';
      targetStartTime = dailySchedules[firstActiveDay]?.startTime || '07:30';
      targetEndTime = dailySchedules[firstActiveDay]?.endTime || '16:00';
      targetBreakStart = dailySchedules[firstActiveDay]?.breakStart || null;
      targetBreakEnd = dailySchedules[firstActiveDay]?.breakEnd || null;
      targetWorkDaysJson = JSON.stringify(activeDays);
      targetDailySchedulesJson = JSON.stringify(dailySchedules);
    } else {
      try {
        activeDays = typeof current.work_days === 'string'
          ? JSON.parse(current.work_days)
          : (current.work_days || []);
      } catch {
        activeDays = [];
      }
    }

    await db.prepare(`
      UPDATE departments SET
        name = ?,
        code = ?,
        manager_name = ?,
        description = ?,
        start_time = ?,
        end_time = ?,
        grace_period_minutes = ?,
        work_days = ?,
        daily_schedules = ?,
        break_start = ?,
        break_end = ?
      WHERE id = ?
    `).run(
      targetName,
      targetCode,
      targetManagerName,
      targetDescription,
      targetStartTime,
      targetEndTime,
      targetGrace,
      targetWorkDaysJson,
      targetDailySchedulesJson,
      targetBreakStart,
      targetBreakEnd,
      id
    );

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: dailySchedules ? 'UPDATE_DEPARTMENT_SCHEDULE' : 'UPDATE_DEPARTMENT',
      entityType: 'department',
      entityId: id,
      details: {
        previousName: current.name,
        newName: targetName,
        previousCode: current.code,
        newCode: targetCode,
        managerName: targetManagerName,
        gracePeriodMinutes: targetGrace,
        activeDays,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Data departemen "${targetName}" (${targetCode}) berhasil diperbarui dan disinkronkan ke seluruh sistem.`,
      department: {
        id,
        name: targetName,
        code: targetCode,
        manager_name: targetManagerName,
        description: targetDescription,
        grace_period_minutes: targetGrace,
      },
    });
  } catch (err: any) {
    console.error('Department PUT error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui jadwal departemen' }, { status: 500 });
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
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        } else if (body.id) {
          idsToDelete = [body.id];
        }
      } catch {
        // No body
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Pilih sekurang-kurangnya satu departemen yang akan dihapus' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if any target department contains active employees
    const placeholders = idsToDelete.map(() => '?').join(',');
    const activeStaff = await db.prepare(`
      SELECT d.name as department_name, count(e.id) as staff_count
      FROM departments d
      JOIN employees e ON e.department_id = d.id
      WHERE d.id IN (${placeholders}) AND e.is_active = 1
      GROUP BY d.id
    `).all(...idsToDelete) as any[];

    if (activeStaff.length > 0) {
      const busyList = activeStaff.map((s) => `"${s.department_name}" (${s.staff_count} pegawai)`).join(', ');
      return NextResponse.json(
        {
          error: `Departemen berikut tidak dapat dihapus karena masih menaungi staf aktif: ${busyList}. Silakan alihkan staf ke departemen lain terlebih dahulu melalui menu Data Pegawai.`,
        },
        { status: 400 }
      );
    }

    // Perform deletion
    const deletedDepts = await db.prepare(`SELECT id, name, code FROM departments WHERE id IN (${placeholders})`).all(...idsToDelete) as any[];

    await db.prepare(`DELETE FROM departments WHERE id IN (${placeholders})`).run(...idsToDelete);

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'DELETE_DEPARTMENT',
      entityType: 'department',
      entityId: idsToDelete.join(','),
      details: {
        deletedCount: idsToDelete.length,
        deletedDepartments: deletedDepts.map((d) => `${d.name} (${d.code})`),
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} departemen berhasil dihapus dari sistem.`,
      deletedCount: idsToDelete.length,
    });
  } catch (err: any) {
    console.error('Departments DELETE error:', err);
    return NextResponse.json({ error: 'Gagal menghapus departemen' }, { status: 500 });
  }
}
