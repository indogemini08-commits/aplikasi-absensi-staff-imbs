function convertSqlToPostgres(sql) {
  let s = sql.trim();
  // Strip PRAGMA
  if (/^PRAGMA\s+/i.test(s)) {
    return null;
  }
  // Convert strftime('%Y-%m', date) to SUBSTR(date, 1, 7)
  s = s.replace(/strftime\s*\(\s*['"]%Y-%m['"]\s*,\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 7)');
  // Convert strftime('%Y', date) to SUBSTR(date, 1, 4)
  s = s.replace(/strftime\s*\(\s*['"]%Y['"]\s*,\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 4)');
  // Convert INSERT OR IGNORE INTO to INSERT INTO ... ON CONFLICT DO NOTHING
  if (/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(s)) {
    s = s.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ');
    if (!/ON\s+CONFLICT/i.test(s)) {
      s += ' ON CONFLICT DO NOTHING';
    }
  }
  // Convert ? to $1, $2, $3
  let pIdx = 1;
  s = s.replace(/\?/g, () => `$${pIdx++}`);
  return s;
}

console.log('Test 1:', convertSqlToPostgres('SELECT * FROM users WHERE id = ? AND is_active = ?'));
console.log('Test 2:', convertSqlToPostgres("SELECT * FROM attendance WHERE strftime('%Y-%m', date) = ?"));
console.log('Test 3:', convertSqlToPostgres('PRAGMA foreign_keys = ON;'));
console.log('Test 4:', convertSqlToPostgres('INSERT OR IGNORE INTO leave_types (id, name) VALUES (?, ?)'));
