import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getDb();
  // Get unread notification count
  const unreadNotif = await db.prepare(`
    SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(user.userId) as { count: number };

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      unreadNotifications: unreadNotif?.count || 0,
    },
  });
}

