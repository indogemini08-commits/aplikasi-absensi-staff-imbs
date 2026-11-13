import { getDb } from './db';

export function createNotification({
  userId,
  title,
  message,
  type = 'system',
  referenceId,
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'leave' | 'attendance' | 'correction' | 'system';
  referenceId?: string | null;
}) {
  try {
    const db = getDb();
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, userId, title, message, type, referenceId || null, now);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Sends notification to all admin users.
 */
export function notifyAdmins({
  title,
  message,
  type = 'system',
  referenceId,
}: {
  title: string;
  message: string;
  type?: 'leave' | 'attendance' | 'correction' | 'system';
  referenceId?: string | null;
}) {
  try {
    const db = getDb();
    const admins = db.prepare(`SELECT id FROM users WHERE role IN ('admin', 'superadmin') AND is_active = 1`).all() as { id: string }[];
    for (const a of admins) {
      createNotification({
        userId: a.id,
        title,
        message,
        type,
        referenceId,
      });
    }
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
}

