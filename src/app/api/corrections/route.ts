import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';
import { notifyAdmins } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const db = getDb();
    let query = `
      SELECT ac.*, e.name as employee_name, e.nip as employee_nip, d.name as department_name,
             u.username as approver_name
      FROM attendance_corrections ac
      JOIN employees e ON ac.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON ac.reviewed_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'staff') {
      query += ` AND ac.employee_id = ?`;
      params.push(user.employeeId);
    }

    query += ` ORDER BY ac.created_at DESC`;
    const corrections = await db.prepare(query).all(...params);

    return NextResponse.json({ corrections });
  } catch (err: any) {
    console.error('Correction GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat pengajuan koreksi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const {
      date,
      correctionType,
      correctedClockIn,
      correctedClockOut,
      reason,
      proofAttachment,
    } = await req.json();

    if (!date || !correctionType || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Tanggal, jenis koreksi, dan alasan (minimal 5 karakter) wajib diisi.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const existingAtt = await db.prepare(`
      SELECT id FROM attendance_records WHERE employee_id = ? AND date = ?
    `).get(user.employeeId, date) as any;

    const id = `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO attendance_corrections (
        id, employee_id, attendance_id, date, correction_type,
        corrected_clock_in, corrected_clock_out, reason, proof_attachment, status, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?
      )
    `).run(
      id,
      user.employeeId,
      existingAtt ? existingAtt.id : null,
      date,
      correctionType,
      correctedClockIn || null,
      correctedClockOut || null,
      reason.trim(),
      proofAttachment || null,
      now
    );

    // Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'SUBMIT_ATTENDANCE_CORRECTION',
      entityType: 'attendance_correction',
      entityId: id,
      details: { date, correctionType, reason: reason.trim() },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    // Notify admins
    notifyAdmins({
      title: 'Pengajuan Koreksi Absensi',
      message: `${user.name} mengajukan koreksi absensi untuk tanggal ${date}.`,
      type: 'correction',
      referenceId: id,
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan koreksi absensi berhasil dikirim dan menunggu peninjauan HRD.',
      id,
    });
  } catch (err: any) {
    console.error('Submit correction error:', err);
    return NextResponse.json({ error: 'Gagal mengajukan koreksi absensi' }, { status: 500 });
  }
}

