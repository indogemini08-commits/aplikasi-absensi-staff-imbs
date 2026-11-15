import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, createSessionToken, COOKIE_NAME, invalidateUserSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' }, { status: 401 });
    }

    const body = await req.json();
    const { newPassword, confirmPassword } = body;

    if (!newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Kata sandi baru dan konfirmasi kata sandi wajib diisi.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Konfirmasi kata sandi tidak cocok.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    }

    if (newPassword.toLowerCase() === 'password123') {
      return NextResponse.json({ error: 'Harap gunakan kata sandi mandiri selain kata sandi default sistem.' }, { status: 400 });
    }

    const db = getDb();
    const newHash = hashPassword(newPassword);
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE users SET
        password_hash = ?,
        needs_password_change = 0,
        updated_at = ?
      WHERE id = ?
    `).run(newHash, now, user.userId);

    // Invalidate cached session so new requests see needsPasswordChange = false
    invalidateUserSession(user.userId);

    // Create fresh session token without needsPasswordChange flag
    const updatedSession = {
      ...user,
      needsPasswordChange: false,
    };
    const token = createSessionToken(updatedSession);

    // Record audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'FIRST_TIME_PASSWORD_SET',
      entityType: 'user',
      entityId: user.userId,
      details: { username: user.username, role: user.role },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const redirectUrl = user.role === 'staff' ? '/dashboard' : '/admin';

    const response = NextResponse.json({
      success: true,
      message: 'Kata sandi mandiri berhasil dibuat! Akun Anda kini aktif sepenuhnya.',
      user: updatedSession,
      redirectUrl,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('Set password error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui kata sandi mandiri.' }, { status: 500 });
  }
}

