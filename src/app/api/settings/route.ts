import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT key, value, description FROM app_settings`).all() as any[];
    const settings = rows.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ settings, list: rows });
  } catch (err: any) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat pengaturan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { settings } = await req.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Data pengaturan tidak valid' }, { status: 400 });
    }

    const db = getDb();
    const updateStmt = db.prepare(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(settings)) {
      updateStmt.run(key, String(value));
    }

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'UPDATE_APP_SETTINGS',
      entityType: 'app_settings',
      details: settings,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: 'Pengaturan sistem berhasil disimpan' });
  } catch (err: any) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui pengaturan' }, { status: 500 });
  }
}

