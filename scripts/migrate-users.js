const { query, execute } = require('../src/lib/db.ts');

async function migrate() {
  console.log('Migrating users table...');
  try {
    // Add columns to Postgres
    await execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT');
    await execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT');
    await execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT');
    await execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT');
    console.log('Postgres columns ensured.');
  } catch (e) {
    console.warn('Postgres alter error (may already exist):', e.message);
  }

  // Check current users
  const users = await query('SELECT id, username, email, role, is_active, full_name FROM users');
  console.log('Current users:', users);

  // Update existing users with full names if null
  for (const u of users) {
    if (!u.full_name) {
      let defaultName = u.username === 'superadmin' ? 'Super Administrator IMBS'
        : u.username === 'admin' ? 'Administrator IMBS'
        : u.username === 'aldri' ? 'Aldri Wahyudi Chandra'
        : u.username === 'fauzan' ? 'Fauzan Azhiimaa, Lc'
        : u.username;
      await execute('UPDATE users SET full_name = ? WHERE id = ?', [defaultName, u.id]);
      console.log(`Updated user ${u.username} with name: ${defaultName}`);
    }
  }

  const updated = await query('SELECT id, username, email, role, is_active, full_name FROM users');
  console.log('Updated users:', updated);
}

migrate().catch(console.error);
