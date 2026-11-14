import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from './db';

const SESSION_COOKIE_NAME = 'imbs_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'imbs-presensi-secret-key-2026-cibubur';

export interface UserSession {
  userId: string;
  username: string;
  email?: string;
  role: 'superadmin' | 'admin' | 'staff' | 'hrd' | 'tu' | string;
  employeeId?: string;
  name?: string;
  nip?: string;
  departmentId?: string;
  departmentName?: string;
  position?: string;
}

export function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function createSessionToken(payload: UserSession): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  });
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex');
  return Buffer.from(`${data}.${signature}`).toString('base64url');
}

export function verifySessionToken(token: string): (UserSession & { exp: number }) | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const lastDotIndex = raw.lastIndexOf('.');
    if (lastDotIndex === -1) return null;

    const data = raw.substring(0, lastDotIndex);
    const signature = raw.substring(lastDotIndex + 1);

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) return null;

    const parsed = JSON.parse(data);
    if (parsed.exp && parsed.exp < Date.now()) {
      return null; // Expired
    }
    return parsed;
  } catch {
    return null;
  }
}

// In-memory user session cache for high performance (TTL: 60 seconds)
const userSessionCache = new Map<string, { session: UserSession; expiresAt: number }>();

export function invalidateUserSession(userId?: string) {
  if (userId) {
    userSessionCache.delete(userId);
  } else {
    userSessionCache.clear();
  }
}

/**
 * Retrieves the currently logged-in user from the session cookie and database.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = verifySessionToken(token);
    if (!session) return null;

    // Check fast in-memory cache first
    const cached = userSessionCache.get(session.userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session;
    }

    try {
      const db = getDb();
      const userRow = (await db.prepare(`
        SELECT u.id as user_id, u.username, u.email, u.role, u.is_active, u.full_name,
               e.id as employee_id, e.nip, e.name, e.department_id, e.position,
               d.name as department_name
        FROM users u
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE u.id = ? AND u.is_active = 1
      `).get(session.userId)) as any;

      if (!userRow) {
        // User was deleted or deactivated
        userSessionCache.delete(session.userId);
        return null;
      }

      const userSession: UserSession = {
        userId: userRow.user_id,
        username: userRow.username,
        email: userRow.email,
        role: userRow.role,
        employeeId: userRow.employee_id,
        name: userRow.name || userRow.full_name || userRow.username,
        nip: userRow.nip,
        departmentId: userRow.department_id,
        departmentName: userRow.department_name,
        position: userRow.position,
      };

      // Cache for 60 seconds
      userSessionCache.set(session.userId, {
        session: userSession,
        expiresAt: Date.now() + 60_000,
      });

      return userSession;
    } catch (dbErr) {
      console.warn('DB session verification warning, using cryptographically verified token payload:', dbErr);
      // Fallback to verified HMAC session token to avoid false logouts during DB latency or cold start
      const fallbackSession: UserSession = {
        userId: session.userId,
        username: session.username,
        role: session.role,
        employeeId: session.employeeId,
        name: session.name || session.username,
        nip: session.nip,
        departmentId: session.departmentId,
        departmentName: session.departmentName,
        position: session.position,
      };
      return fallbackSession;
    }
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}

export const COOKIE_NAME = SESSION_COOKIE_NAME;

