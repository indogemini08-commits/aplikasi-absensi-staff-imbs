import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const search = searchParams.get('search');

    const db = getDb();
    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: any[] = [];

    if (action) {
      query += ` AND action = ?`;
      params.push(action);
    }

    if (search) {
      query += ` AND (user_name LIKE ? OR details LIKE ? OR action LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;
    const logs = await db.prepare(query).all(...params);

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('Audit logs error:', err);
    return NextResponse.json({ error: 'Gagal memuat audit log' }, { status: 500 });
  }
}

