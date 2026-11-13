import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { calculateDaysBetween, formatIndonesianDate } from '@/lib/date';
import { recordAuditLog } from '@/lib/audit';
import { notifyAdmins } from '@/lib/notify';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const db = getDb();

    let query = `
      SELECT lr.*,
             lt.name as leave_type_name,
             lt.code as leave_type_code,
             lt.deducts_leave_balance,
             e.name as employee_name,
             e.nip as employee_nip,
             d.name as department_name,
             u.username as approver_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON lr.approved_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'staff') {
      query += ` AND lr.employee_id = ?`;
      params.push(user.employeeId);
    } else if (employeeId) {
      query += ` AND lr.employee_id = ?`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND lr.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY lr.created_at DESC`;

    const requests = await db.prepare(query).all(...params) as any[];

    // Fetch leave types
    const leaveTypes = await db.prepare(`SELECT * FROM leave_types ORDER BY name ASC`).all();

    // Fetch employee's balance
    let balance = null;
    if (user.employeeId) {
      balance = await db.prepare(`
        SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?
      `).get(user.employeeId, new Date().getFullYear()) as any;
    }

    const formattedRequests = requests.map((r) => ({
      ...r,
      formattedStartDate: formatIndonesianDate(r.start_date),
      formattedEndDate: formatIndonesianDate(r.end_date),
    }));

    return NextResponse.json({
      requests: formattedRequests,
      leaveTypes,
      balance,
    });
  } catch (err: any) {
    console.error('Leave GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat data permohonan izin/cuti' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const body = await req.json();
    const {
      leaveTypeId,
      startDate,
      endDate,
      reason,
      attachmentUrl,
      emergencyContact,
    } = body;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'Jenis pengajuan, tanggal mulai, tanggal selesai, dan alasan wajib diisi.' },
        { status: 400 }
      );
    }

    // Date range validation
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 1. Check leave type
    const leaveType = await db.prepare(`SELECT * FROM leave_types WHERE id = ?`).get(leaveTypeId) as any;
    if (!leaveType) {
      return NextResponse.json({ error: 'Jenis izin/cuti tidak ditemukan.' }, { status: 404 });
    }

    const totalDays = calculateDaysBetween(startDate, endDate);
    if (totalDays <= 0) {
      return NextResponse.json({ error: 'Durasi hari tidak valid.' }, { status: 400 });
    }

    // 2. Collision check with existing active leaves
    const collision = await db.prepare(`
      SELECT id, start_date, end_date FROM leave_requests
      WHERE employee_id = ? AND status IN ('pending', 'approved')
        AND (
          (? BETWEEN start_date AND end_date) OR
          (? BETWEEN start_date AND end_date) OR
          (start_date BETWEEN ? AND ?)
        )
    `).get(user.employeeId, startDate, endDate, startDate, endDate) as any;

    if (collision) {
      return NextResponse.json(
        { error: `Terdapat pengajuan izin/cuti lain yang bertabrakan pada rentang tanggal tersebut (${collision.start_date} s/d ${collision.end_date}).` },
        { status: 400 }
      );
    }

    // 3. Balance check if it deducts leave balance
    let balance = null;
    const currentYear = new Date().getFullYear();
    if (leaveType.deducts_leave_balance === 1) {
      balance = await db.prepare(`
        SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?
      `).get(user.employeeId, currentYear) as any;

      if (!balance || balance.remaining_days < totalDays) {
        return NextResponse.json(
          {
            error: `Sisa saldo cuti Anda tidak mencukupi. Sisa: ${balance ? balance.remaining_days : 0} hari, diajukan: ${totalDays} hari.`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Insert request inside transaction
    const requestId = `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.exec('BEGIN TRANSACTION;');
    try {
      await db.prepare(`
        INSERT INTO leave_requests (
          id, employee_id, leave_type_id, start_date, end_date, total_days,
          reason, attachment_url, emergency_contact, status, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?
        )
      `).run(
        requestId,
        user.employeeId,
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason.trim(),
        attachmentUrl || null,
        emergencyContact || null,
        now
      );

      // If deducts balance, update pending_days and remaining_days
      if (leaveType.deducts_leave_balance === 1 && balance) {
        const newPending = balance.pending_days + totalDays;
        const newRemaining = balance.allocated_days - balance.used_days - newPending;
        await db.prepare(`
          UPDATE leave_balances SET
            pending_days = ?,
            remaining_days = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newPending, newRemaining, now, balance.id);
      }

      await db.exec('COMMIT;');
    } catch (txErr) {
      await db.exec('ROLLBACK;');
      throw txErr;
    }

    // 5. Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'SUBMIT_LEAVE_REQUEST',
      entityType: 'leave_request',
      entityId: requestId,
      details: {
        leaveType: leaveType.name,
        startDate,
        endDate,
        totalDays,
        reason: reason.trim(),
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    // 6. Notify admins
    notifyAdmins({
      title: 'Permohonan Izin / Cuti Baru',
      message: `${user.name} mengajukan ${leaveType.name} (${totalDays} hari) mulai ${startDate} s/d ${endDate}.`,
      type: 'leave',
      referenceId: requestId,
    });

    return NextResponse.json({
      success: true,
      message: `Permohonan ${leaveType.name} selama ${totalDays} hari berhasil dikirimkan dan menunggu persetujuan HRD.`,
      requestId,
    });
  } catch (err: any) {
    console.error('Submit leave error:', err);
    return NextResponse.json({ error: 'Gagal mengajukan permohonan izin/cuti' }, { status: 500 });
  }
}

