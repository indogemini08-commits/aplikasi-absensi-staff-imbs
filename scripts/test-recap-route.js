const { getDb } = require('./src/lib/db');

async function testRecap() {
  const db = getDb();
  const res = db.prepare('SELECT count(*) as count FROM attendance_records').get();
  console.log('Total attendance records:', res.count);

  const empRes = db.prepare('SELECT count(*) as count FROM employees WHERE is_active = 1').get();
  console.log('Active employees count:', empRes.count);
}

testRecap();

