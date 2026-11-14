import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin/HRD yang dapat memproses permohonan.' }, { status: 403 });
    }

    const { requestId, action, notes } = await req.json();

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Data aksi tidak valid' }, { status: 400 });
    }

    const db = getDb();
    const leaveReq = await db.prepare(`
      SELECT lr.*, lt.name as leave_type_name, lt.deducts_leave_balance, e.user_id as emp_user_id, e.name as emp_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = ?
    `).get(requestId) as any;

    if (!leaveReq) {
      return NextResponse.json({ error: 'Permohonan tidak ditemukan' }, { status: 404 });
    }

    if (leaveReq.status !== 'pending') {
      return NextResponse.json({ error: `Permohonan sudah berstatus ${leaveReq.status}` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();

    await db.exec('BEGIN TRANSACTION;');
    try {
      if (action === 'approve') {
        await db.prepare(`
          UPDATE leave_requests SET
            status = 'approved',
            approved_by = ?,
            approved_at = ?,
            rejection_reason = NULL
          WHERE id = ?
        `).run(user.userId, now, requestId);

        // Deduct from balance if applicable
        if (leaveReq.deducts_leave_balance === 1) {
          const balance = await db.prepare(`
            SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?
          `).get(leaveReq.employee_id, currentYear) as any;

          if (balance) {
            const newPending = Math.max(0, balance.pending_days - leaveReq.total_days);
            const newUsed = balance.used_days + leaveReq.total_days;
            const newRemaining = balance.allocated_days - newUsed - newPending;
            await db.prepare(`
              UPDATE leave_balances SET
                used_days = ?,
                pending_days = ?,
                remaining_days = ?,
                updated_at = ?
              WHERE id = ?
            `).run(newUsed, newPending, newRemaining, now, balance.id);
          }
        }
      } else {
        // Reject
        await db.prepare(`
          UPDATE leave_requests SET
            status = 'rejected',
            approved_by = ?,
            approved_at = ?,
            rejection_reason = ?
          WHERE id = ?
        `).run(user.userId, now, notes || 'Ditolak oleh HRD', requestId);

        // Restore pending balance if applicable
        if (leaveReq.deducts_leave_balance === 1) {
          const balance = await db.prepare(`
            SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?
          `).get(leaveReq.employee_id, currentYear) as any;

          if (balance) {
            const newPending = Math.max(0, balance.pending_days - leaveReq.total_days);
            const newRemaining = balance.allocated_days - balance.used_days - newPending;
            await db.prepare(`
              UPDATE leave_balances SET
                pending_days = ?,
                remaining_days = ?,
                updated_at = ?
              WHERE id = ?
            `).run(newPending, newRemaining, now, balance.id);
          }
        }
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
      action: action === 'approve' ? 'APPROVE_LEAVE_REQUEST' : 'REJECT_LEAVE_REQUEST',
      entityType: 'leave_request',
      entityId: requestId,
      details: {
        employeeName: leaveReq.emp_name,
        leaveType: leaveReq.leave_type_name,
        days: leaveReq.total_days,
        notes: notes || null,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    // Notify employee
    createNotification({
      userId: leaveReq.emp_user_id,
      title: action === 'approve' ? 'Permohonan Cuti Disetujui' : 'Permohonan Cuti Ditolak',
      message: action === 'approve'
        ? `Permohonan ${leaveReq.leave_type_name} Anda (${leaveReq.start_date} s/d ${leaveReq.end_date}) telah disetujui oleh ${user.name}.`
        : `Permohonan ${leaveReq.leave_type_name} Anda ditolak dengan catatan: "${notes || 'Tidak memenuhi kriteria'}"`,
      type: 'leave',
      referenceId: requestId,
    });

    return NextResponse.json({
      success: true,
      message: `Permohonan ${leaveReq.leave_type_name} berhasil ${action === 'approve' ? 'Disetujui' : 'Ditolak'}.`,
    });
  } catch (err: any) {
    console.error('Leave action error:', err);
    return NextResponse.json({ error: 'Gagal memproses permohonan' }, { status: 500 });
  }
}

