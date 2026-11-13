import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const db = getDb();

    let query = `
      SELECT a.*,
             e.name as employee_name,
             e.nip as employee_nip,
             d.name as department_name,
             l1.name as in_location_name,
             l2.name as out_location_name,
             lr.reason as late_reason,
             lr.status as late_reason_status
      FROM attendance_records a
      JOIN employees e ON a.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_locations l1 ON a.clock_in_location_id = l1.id
      LEFT JOIN work_locations l2 ON a.clock_out_location_id = l2.id
      LEFT JOIN late_reasons lr ON a.id = lr.attendance_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    } else if (startDate && endDate) {
      query += ` AND a.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (departmentId) {
      query += ` AND e.department_id = ?`;
      params.push(departmentId);
    }

    if (status) {
      query += ` AND a.clock_in_status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (e.name LIKE ? OR e.nip LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY a.date DESC, a.clock_in_time DESC`;

    const records = await db.prepare(query).all(...params);

    return NextResponse.json({ records });
  } catch (err: any) {
    console.error('Fetch all attendance error:', err);
    return NextResponse.json({ error: 'Gagal memuat data absensi' }, { status: 500 });
  }
}

// Manual correction by Admin
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const {
      id,
      clockInTime,
      clockOutTime,
      clockInStatus,
      correctionReason,
    } = await req.json();

    if (!id || !correctionReason || correctionReason.trim().length < 5) {
      return NextResponse.json(
        { error: 'ID dan alasan koreksi (minimal 5 karakter) wajib diisi untuk catatan audit.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const current = await db.prepare(`SELECT * FROM attendance_records WHERE id = ?`).get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Data absensi tidak ditemukan' }, { status: 404 });
    }

    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE attendance_records SET
        clock_in_time = ?,
        clock_out_time = ?,
        clock_in_status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      clockInTime || current.clock_in_time,
      clockOutTime || current.clock_out_time,
      clockInStatus || current.clock_in_status,
      now,
      id
    );

    // Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CORRECT_ATTENDANCE_ADMIN',
      entityType: 'attendance',
      entityId: id,
      details: {
        previous: {
          in: current.clock_in_time,
          out: current.clock_out_time,
          status: current.clock_in_status,
        },
        updated: {
          in: clockInTime || current.clock_in_time,
          out: clockOutTime || current.clock_out_time,
          status: clockInStatus || current.clock_in_status,
        },
        reason: correctionReason,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'Data absensi berhasil diperbarui dan terekam di Audit Log.',
    });
  } catch (err: any) {
    console.error('Correction error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui data absensi' }, { status: 500 });
  }
}

