import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let unreadCount = 0;
    try {
      const db = getDb();
      // Get unread notification count
      const unreadNotif = (await db.prepare(`
        SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
      `).get(user.userId)) as { count: number };
      unreadCount = Number(unreadNotif?.count) || 0;
    } catch {
      unreadCount = 0;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        unreadNotifications: unreadCount,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

