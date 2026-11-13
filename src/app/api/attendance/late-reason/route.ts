import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';
import { notifyAdmins } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const { attendanceId, reason } = await req.json();

    if (!attendanceId || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Alasan keterlambatan wajib diisi minimal 5 karakter' },
        { status: 400 }
      );
    }

    const db = getDb();
    const attendance = db.prepare(`
      SELECT * FROM attendance_records WHERE id = ? AND employee_id = ?
    `).get(attendanceId, user.employeeId) as any;

    if (!attendance) {
      return NextResponse.json(
        { error: 'Data absensi tidak ditemukan atau bukan milik Anda' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const existingReason = db.prepare(`SELECT id FROM late_reasons WHERE attendance_id = ?`).get(attendanceId) as any;

    if (existingReason) {
      db.prepare(`
        UPDATE late_reasons SET reason = ?, submitted_at = ?, status = 'pending'
        WHERE id = ?
      `).run(reason.trim(), now, existingReason.id);
    } else {
      const id = `lr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO late_reasons (id, attendance_id, employee_id, reason, submitted_at, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(id, attendanceId, user.employeeId, reason.trim(), now);
    }

    // Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'SUBMIT_LATE_REASON',
      entityType: 'late_reason',
      entityId: attendanceId,
      details: { reason: reason.trim() },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    // Notify admins
    notifyAdmins({
      title: 'Alasan Keterlambatan Masuk',
      message: `${user.name} telah mengirimkan alasan keterlambatan: "${reason.trim().substring(0, 80)}..."`,
      type: 'attendance',
      referenceId: attendanceId,
    });

    return NextResponse.json({
      success: true,
      message: 'Alasan keterlambatan berhasil dikirimkan dan sedang menunggu peninjauan HRD.',
    });
  } catch (err: any) {
    console.error('Late reason error:', err);
    return NextResponse.json({ error: 'Gagal mengirimkan alasan keterlambatan' }, { status: 500 });
  }
}

// Review by Admin
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Hanya Admin atau HRD yang berhak meninjau alasan keterlambatan' }, { status: 403 });
    }

    const { id, status, adminNotes } = await req.json();

    if (!id || !['reviewed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status peninjauan tidak valid' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE late_reasons SET
        status = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        admin_notes = ?
      WHERE id = ?
    `).run(status, user.userId, now, adminNotes || null, id);

    // Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'REVIEW_LATE_REASON',
      entityType: 'late_reason',
      entityId: id,
      details: { status, adminNotes },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Alasan keterlambatan berhasil ditandai sebagai ${status === 'reviewed' ? 'Disetujui / Diterima' : 'Ditolak'}.`,
    });
  } catch (err: any) {
    console.error('Review late reason error:', err);
    return NextResponse.json({ error: 'Gagal meninjau alasan keterlambatan' }, { status: 500 });
  }
}

