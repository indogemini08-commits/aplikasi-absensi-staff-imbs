import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const db = getDb();
    const notifications = await db.prepare(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(user.userId);

    const unreadCount = await db.prepare(`
      SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(user.userId) as { count: number };

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount?.count || 0,
    });
  } catch (err: any) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat notifikasi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const { id, markAll } = await req.json();
    const db = getDb();

    if (markAll) {
      await db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.userId);
    } else if (id) {
      await db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(id, user.userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Notifications PUT error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui status notifikasi' }, { status: 500 });
  }
}

