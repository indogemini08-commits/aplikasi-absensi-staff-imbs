import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const holidays = await db.prepare(`SELECT * FROM holidays ORDER BY date ASC`).all();
    return NextResponse.json({ holidays });
  } catch (err: any) {
    console.error('Holidays GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat hari libur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { name, date, type, description } = await req.json();

    if (!name || !date) {
      return NextResponse.json({ error: 'Nama dan tanggal libur wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const id = `hol-${Date.now()}`;

    await db.prepare(`
      INSERT INTO holidays (id, name, date, type, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, date, type || 'institutional', description || null);

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CREATE_HOLIDAY',
      entityType: 'holiday',
      entityId: id,
      details: { name, date, type },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: 'Hari libur berhasil ditambahkan', id });
  } catch (err: any) {
    console.error('Holidays POST error:', err);
    return NextResponse.json({ error: 'Gagal menambahkan hari libur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID hari libur wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    await db.prepare(`DELETE FROM holidays WHERE id = ?`).run(id);

    return NextResponse.json({ success: true, message: 'Hari libur berhasil dihapus' });
  } catch (err: any) {
    console.error('Holidays DELETE error:', err);
    return NextResponse.json({ error: 'Gagal menghapus hari libur' }, { status: 500 });
  }
}

