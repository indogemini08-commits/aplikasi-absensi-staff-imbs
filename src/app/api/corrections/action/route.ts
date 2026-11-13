import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id, action, notes } = await req.json();

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Data aksi tidak valid' }, { status: 400 });
    }

    const db = getDb();
    const corr = await db.prepare(`
      SELECT ac.*, e.user_id as emp_user_id, e.name as emp_name
      FROM attendance_corrections ac
      JOIN employees e ON ac.employee_id = e.id
      WHERE ac.id = ?
    `).get(id) as any;

    if (!corr) {
      return NextResponse.json({ error: 'Pengajuan koreksi tidak ditemukan' }, { status: 404 });
    }

    if (corr.status !== 'pending') {
      return NextResponse.json({ error: `Pengajuan sudah berstatus ${corr.status}` }, { status: 400 });
    }

    const now = new Date().toISOString();

    await db.exec('BEGIN TRANSACTION;');
    try {
      if (action === 'approve') {
        // Update or insert attendance record
        let att = null;
        if (corr.attendance_id) {
          att = await db.prepare(`SELECT * FROM attendance_records WHERE id = ?`).get(corr.attendance_id) as any;
        } else {
          att = await db.prepare(`SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?`).get(corr.employee_id, corr.date) as any;
        }

        if (att) {
          await db.prepare(`
            UPDATE attendance_records SET
              clock_in_time = COALESCE(?, clock_in_time),
              clock_out_time = COALESCE(?, clock_out_time),
              updated_at = ?
            WHERE id = ?
          `).run(corr.corrected_clock_in, corr.corrected_clock_out, now, att.id);
        } else {
          const newAttId = `att-corr-${Date.now()}`;
          await db.prepare(`
            INSERT INTO attendance_records (
              id, employee_id, date, clock_in_time, clock_out_time,
              clock_in_status, is_verified, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, 'hadir', 1, ?, ?
            )
          `).run(
            newAttId,
            corr.employee_id,
            corr.date,
            corr.corrected_clock_in || '07:30:00',
            corr.corrected_clock_out || '16:00:00',
            now,
            now
          );
        }

        await db.prepare(`
          UPDATE attendance_corrections SET
            status = 'approved',
            reviewed_by = ?,
            reviewed_at = ?,
            admin_notes = ?
          WHERE id = ?
        `).run(user.userId, now, notes || 'Disetujui oleh HRD', id);
      } else {
        await db.prepare(`
          UPDATE attendance_corrections SET
            status = 'rejected',
            reviewed_by = ?,
            reviewed_at = ?,
            admin_notes = ?
          WHERE id = ?
        `).run(user.userId, now, notes || 'Ditolak oleh HRD', id);
      }

      await db.exec('COMMIT;');
    } catch (txErr) {
      await db.exec('ROLLBACK;');
      throw txErr;
    }

    // Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: action === 'approve' ? 'APPROVE_ATTENDANCE_CORRECTION' : 'REJECT_ATTENDANCE_CORRECTION',
      entityType: 'attendance_correction',
      entityId: id,
      details: {
        employeeName: corr.emp_name,
        date: corr.date,
        type: corr.correction_type,
        notes: notes || null,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    // Notify employee
    createNotification({
      userId: corr.emp_user_id,
      title: action === 'approve' ? 'Koreksi Absensi Disetujui' : 'Koreksi Absensi Ditolak',
      message: action === 'approve'
        ? `Pengajuan koreksi absensi tanggal ${corr.date} Anda telah disetujui.`
        : `Pengajuan koreksi absensi tanggal ${corr.date} ditolak: "${notes || 'Tidak memenuhi ketentuan'}"`,
      type: 'correction',
      referenceId: id,
    });

    return NextResponse.json({
      success: true,
      message: `Koreksi absensi berhasil ${action === 'approve' ? 'Disetujui' : 'Ditolak'}.`,
    });
  } catch (err: any) {
    console.error('Correction action error:', err);
    return NextResponse.json({ error: 'Gagal memproses aksi koreksi' }, { status: 500 });
  }
}

