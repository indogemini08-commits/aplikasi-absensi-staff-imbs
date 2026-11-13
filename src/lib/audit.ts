import { getDb } from './db';

export function recordAuditLog({
  userId,
  userName,
  action,
  entityType,
  entityId,
  details,
  ipAddress = '127.0.0.1',
}: {
  userId?: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string;
}) {
  try {
    const db = getDb();
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, userName, action, entityType, entityId || null, detailsStr, ipAddress, now);
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}

