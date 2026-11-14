import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, invalidateUserSession } from '@/lib/auth';
import { getDb, query, queryOne, execute } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

// GET: Fetch all admin accounts & current security settings
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Akses ditolak. Memerlukan hak akses administrator.' }, { status: 403 });
    }

    // Fetch all admin accounts (exclude pure staff)
    const adminRows = await query(`
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.full_name, u.phone,
             u.last_login_at, u.last_login_ip, u.created_at, u.updated_at,
             e.id as employee_id, e.nip, e.position
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.role IN ('superadmin', 'admin', 'hrd', 'tu')
      ORDER BY 
        CASE u.role 
          WHEN 'superadmin' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'hrd' THEN 3 
          WHEN 'tu' THEN 4 
          ELSE 5 
        END,
        u.created_at ASC
    `);

    // Fetch security settings from app_settings
    const settingsRows = await query(`
      SELECT key, value FROM app_settings 
      WHERE key IN ('session_timeout_days', 'admin_require_strong_pass', 'admin_login_lockout_attempts')
    `);

    const securitySettings: Record<string, any> = {
      session_timeout_days: '7',
      admin_require_strong_pass: '1',
      admin_login_lockout_attempts: '5',
    };

    for (const r of settingsRows) {
      securitySettings[r.key] = r.value;
    }

    return NextResponse.json({
      success: true,
      currentUserRole: user.role,
      currentUserId: user.userId,
      accounts: adminRows,
      securitySettings,
    });
  } catch (error: any) {
    console.error('Fetch admin accounts error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat akun admin' }, { status: 500 });
  }
}

// POST: Create a new admin account (superadmin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Hanya Super Administrator yang berhak membuat akun admin baru.' }, { status: 403 });
    }

    const body = await req.json();
    const { username, email, password, role, fullName, phone } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Username, password, dan role wajib diisi.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const validRoles = ['superadmin', 'admin', 'hrd', 'tu'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@imbs.sch.id`;

    // Check duplicate username or email
    const existing = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, cleanEmail]);
    if (existing) {
      return NextResponse.json({ error: 'Username atau email sudah digunakan.' }, { status: 409 });
    }

    const newId = `usr-${cleanUsername.replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
    const passHash = hashPassword(password);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO users (id, username, email, password_hash, role, is_active, full_name, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, [newId, cleanUsername, cleanEmail, passHash, role, fullName || cleanUsername, phone || '', now, now]);

    await recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CREATE_ADMIN_ACCOUNT',
      entityType: 'user',
      entityId: newId,
      details: `Membuat akun admin baru: ${cleanUsername} (${role})`,
    });

    return NextResponse.json({
      success: true,
      message: `Akun administrator "${cleanUsername}" berhasil dibuat.`,
      accountId: newId,
    });
  } catch (error: any) {
    console.error('Create admin account error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan akun admin' }, { status: 500 });
  }
}

// PUT: Update admin account or security settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // Action 1: Update Security Policy (superadmin only)
    if (action === 'update_security_policy') {
      if (user.role !== 'superadmin') {
        return NextResponse.json({ error: 'Hanya Superadmin yang berhak mengubah kebijakan keamanan.' }, { status: 403 });
      }

      const { sessionTimeoutDays, requireStrongPass, lockoutAttempts } = body;
      const db = getDb();

      if (sessionTimeoutDays) {
        await db.prepare(`
          INSERT INTO app_settings (key, value) VALUES ('session_timeout_days', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(String(sessionTimeoutDays));
      }

      if (requireStrongPass !== undefined) {
        await db.prepare(`
          INSERT INTO app_settings (key, value) VALUES ('admin_require_strong_pass', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(String(requireStrongPass));
      }

      if (lockoutAttempts) {
        await db.prepare(`
          INSERT INTO app_settings (key, value) VALUES ('admin_login_lockout_attempts', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(String(lockoutAttempts));
      }

      await recordAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action: 'UPDATE_SECURITY_POLICY',
        entityType: 'app_settings',
        details: 'Memperbarui konfigurasi keamanan & masa sesi admin',
      });

      return NextResponse.json({ success: true, message: 'Kebijakan keamanan sesi berhasil diperbarui.' });
    }

    // Action 2: Update Profile / Role / Status / Password
    const { id, fullName, email, phone, role, isActive, newPassword } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID akun wajib disertakan.' }, { status: 400 });
    }

    const targetUser = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    // Role check: Only superadmin can edit other admins or change roles / active status
    const isEditingSelf = user.userId === id;
    if (!isEditingSelf && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Hanya Super Administrator yang berhak mengedit akun admin lain.' }, { status: 403 });
    }

    // Protection: Cannot deactivate or demote the last superadmin
    if (targetUser.role === 'superadmin' && (isActive === 0 || (role && role !== 'superadmin'))) {
      const superadminCount = await queryOne(`SELECT count(*) as count FROM users WHERE role = 'superadmin' AND is_active = 1`);
      if (Number(superadminCount?.count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Tidak dapat menonaktifkan atau mengubah role Superadmin terakhir di sistem.' }, { status: 400 });
      }
    }

    // Build updates
    const updates: string[] = [];
    const params: any[] = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(fullName.trim());
    }

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone.trim());
    }

    // Role and active status can only be modified by superadmin
    if (user.role === 'superadmin') {
      if (role !== undefined) {
        updates.push('role = ?');
        params.push(role);
      }
      if (isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(Number(isActive));
      }
    }

    // Password change
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
      }
      updates.push('password_hash = ?');
      params.push(hashPassword(newPassword.trim()));
      // Invalidate target user cached session
      invalidateUserSession(id);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);

    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Invalidate session cache if target was updated
    invalidateUserSession(id);

    await recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'UPDATE_ADMIN_ACCOUNT',
      entityType: 'user',
      entityId: id,
      details: `Memperbarui akun admin: ${targetUser.username} (${targetUser.role})`,
    });

    return NextResponse.json({
      success: true,
      message: `Data akun "${targetUser.username}" berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error('Update admin account error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui akun admin' }, { status: 500 });
  }
}

// DELETE: Delete an admin account (superadmin only)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Hanya Super Administrator yang berhak menghapus akun admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID akun wajib disertakan.' }, { status: 400 });
    }

    if (id === user.userId) {
      return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login.' }, { status: 400 });
    }

    const targetUser = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    // Cannot delete the last superadmin
    if (targetUser.role === 'superadmin') {
      const countRow = await queryOne(`SELECT count(*) as count FROM users WHERE role = 'superadmin'`);
      if (Number(countRow?.count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Tidak dapat menghapus Super Administrator terakhir di sistem.' }, { status: 400 });
      }
    }

    // Delete user
    await execute('DELETE FROM users WHERE id = ?', [id]);
    invalidateUserSession(id);

    await recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'DELETE_ADMIN_ACCOUNT',
      entityType: 'user',
      entityId: id,
      details: `Menghapus akun admin: ${targetUser.username} (${targetUser.role})`,
    });

    return NextResponse.json({
      success: true,
      message: `Akun administrator "${targetUser.username}" berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Delete admin account error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus akun admin' }, { status: 500 });
  }
}
