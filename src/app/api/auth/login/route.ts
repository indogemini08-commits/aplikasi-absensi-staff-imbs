import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = await db.prepare(`
      SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active,
             e.id as employee_id, e.nip, e.name, e.department_id, e.position,
             d.name as department_name
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
    `).get(username.trim().toLowerCase(), username.trim().toLowerCase()) as any;

    if (!user) {
      return NextResponse.json(
        { error: 'Akun tidak ditemukan atau telah dinonaktifkan' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Kata sandi tidak sesuai' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employee_id,
      name: user.name || user.username,
      nip: user.nip,
      departmentId: user.department_id,
      departmentName: user.department_name,
      position: user.position,
    };

    const token = createSessionToken(sessionPayload);

    // Audit log
    recordAuditLog({
      userId: user.id,
      userName: user.name || user.username,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: sessionPayload,
      redirectUrl: user.role === 'staff' ? '/dashboard' : '/admin',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses login' },
      { status: 500 }
    );
  }
}

