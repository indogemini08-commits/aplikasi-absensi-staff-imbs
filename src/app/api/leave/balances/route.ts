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

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || `${new Date().getFullYear()}`, 10);

    const db = getDb();

    let query = `
      SELECT lb.*, e.name as employee_name, e.nip as employee_nip, d.name as department_name
      FROM leave_balances lb
      JOIN employees e ON lb.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE lb.year = ?
    `;
    const params: any[] = [year];

    if (user.role === 'staff') {
      query += ` AND lb.employee_id = ?`;
      params.push(user.employeeId);
    }

    query += ` ORDER BY e.name ASC`;
    const balances = db.prepare(query).all(...params);

    return NextResponse.json({ balances, year });
  } catch (err: any) {
    console.error('Leave balance error:', err);
    return NextResponse.json({ error: 'Gagal memuat saldo cuti' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id, allocatedDays } = await req.json();

    if (!id || typeof allocatedDays !== 'number' || allocatedDays < 0) {
      return NextResponse.json({ error: 'Jumlah alokasi cuti tidak valid' }, { status: 400 });
    }

    const db = getDb();
    const current = db.prepare(`SELECT * FROM leave_balances WHERE id = ?`).get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Data saldo cuti tidak ditemukan' }, { status: 404 });
    }

    const newRemaining = allocatedDays - current.used_days - current.pending_days;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE leave_balances SET
        allocated_days = ?,
        remaining_days = ?,
        updated_at = ?
      WHERE id = ?
    `).run(allocatedDays, newRemaining, now, id);

    // Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'UPDATE_LEAVE_BALANCE',
      entityType: 'leave_balance',
      entityId: id,
      details: { previous: current.allocated_days, updated: allocatedDays },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'Alokasi saldo cuti berhasil diperbarui',
    });
  } catch (err: any) {
    console.error('Update leave balance error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui saldo cuti' }, { status: 500 });
  }
}

