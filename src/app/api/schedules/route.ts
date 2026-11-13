import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const db = getDb();
    const shifts = db.prepare(`SELECT * FROM shift_templates ORDER BY name ASC`).all();
    const schedules = db.prepare(`
      SELECT es.*, e.name as employee_name, e.nip, d.name as department_name, st.name as shift_name
      FROM employee_schedules es
      JOIN employees e ON es.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      JOIN shift_templates st ON es.shift_id = st.id
      ORDER BY es.effective_date DESC
    `).all();

    return NextResponse.json({ shifts, schedules });
  } catch (err: any) {
    console.error('Schedule GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat data jadwal' }, { status: 500 });
  }
}

// Assign schedule or create shift
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

    if (action === 'create_shift') {
      const { name, startTime, endTime, gracePeriodMinutes, breakStart, breakEnd, workDays } = body;
      if (!name || !startTime || !endTime) {
        return NextResponse.json({ error: 'Nama shift, jam masuk, dan jam pulang wajib diisi' }, { status: 400 });
      }

      const id = `shift-${Date.now()}`;
      db.prepare(`
        INSERT INTO shift_templates (id, name, start_time, end_time, grace_period_minutes, break_start, break_end, work_days, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        id,
        name,
        startTime,
        endTime,
        gracePeriodMinutes || 10,
        breakStart || null,
        breakEnd || null,
        JSON.stringify(workDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'])
      );

      recordAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action: 'CREATE_SHIFT_TEMPLATE',
        entityType: 'shift_template',
        entityId: id,
        details: { name, startTime, endTime },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, message: 'Template shift berhasil dibuat', id });
    }

    if (action === 'assign_schedule') {
      const { employeeId, shiftId, effectiveDate, notes } = body;
      if (!employeeId || !shiftId || !effectiveDate) {
        return NextResponse.json({ error: 'Pegawai, shift, dan tanggal mulai berlaku wajib diisi' }, { status: 400 });
      }

      const id = `sch-${Date.now()}`;
      db.prepare(`
        INSERT INTO employee_schedules (id, employee_id, shift_id, effective_date, end_date, notes, created_at)
        VALUES (?, ?, ?, ?, NULL, ?, ?)
      `).run(id, employeeId, shiftId, effectiveDate, notes || null, now);

      recordAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action: 'ASSIGN_EMPLOYEE_SCHEDULE',
        entityType: 'employee_schedule',
        entityId: id,
        details: { employeeId, shiftId, effectiveDate },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, message: 'Penugasan jadwal pegawai berhasil disimpan', id });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (err: any) {
    console.error('Schedule POST error:', err);
    return NextResponse.json({ error: 'Gagal memproses pengaturan jadwal' }, { status: 500 });
  }
}

