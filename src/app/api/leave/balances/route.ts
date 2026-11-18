import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      SELECT lb.*, e.name as employee_name, e.nip as employee_nip, e.sort_order, d.name as department_name
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

    query += ` ORDER BY COALESCE(e.sort_order, 999999) ASC, e.nip ASC, e.name ASC`;
    const rawBalances = await db.prepare(query).all(...params) as any[];

    // Query custom order from app_settings
    const customOrderMap = new Map<string, number>();
    try {
      const orderSetting = (await db.prepare(`SELECT value FROM app_settings WHERE key = 'employees_custom_order'`).get()) as any;
      if (orderSetting && orderSetting.value) {
        const orderedIds: string[] = typeof orderSetting.value === 'string' ? JSON.parse(orderSetting.value) : orderSetting.value;
        if (Array.isArray(orderedIds)) {
          orderedIds.forEach((id, idx) => customOrderMap.set(id, idx + 1));
        }
      }
    } catch {}

    const balances = [...rawBalances].sort((a, b) => {
      const orderA = customOrderMap.get(a.employee_id) ?? (typeof a.sort_order === 'number' && a.sort_order > 0 ? a.sort_order : 999999);
      const orderB = customOrderMap.get(b.employee_id) ?? (typeof b.sort_order === 'number' && b.sort_order > 0 ? b.sort_order : 999999);
      if (orderA !== orderB) return orderA - orderB;
      return (a.employee_nip || '').localeCompare(b.employee_nip || '', undefined, { numeric: true, sensitivity: 'base' });
    });

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
    const current = await db.prepare(`SELECT * FROM leave_balances WHERE id = ?`).get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Data saldo cuti tidak ditemukan' }, { status: 404 });
    }

    const newRemaining = allocatedDays - current.used_days - current.pending_days;
    const now = new Date().toISOString();

    await db.prepare(`
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

