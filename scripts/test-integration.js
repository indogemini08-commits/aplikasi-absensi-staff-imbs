async function main() {
  console.log('--- STARTING INTEGRATION TEST SUITE ---');

  console.log('Testing Database connection directly...');
  const { getDb } = require('../src/lib/db.ts');
  const db = getDb();

  const userCount = db.prepare('SELECT count(*) as c FROM users').get();
  console.log('✓ Users count in SQLite:', userCount.c);

  const locs = db.prepare('SELECT * FROM work_locations').all();
  console.log('✓ Work locations:', locs.map(l => `${l.name} (Radius: ${l.radius_meters}m)`));

  const shifts = db.prepare('SELECT * FROM shift_templates').all();
  console.log('✓ Shift templates:', shifts.map(s => `${s.name} (${s.start_time}-${s.end_time} WIB)`));

  // Test geofencing formula directly
  const { checkGeofence } = require('../src/lib/geo.ts');
  const campus = { latitude: -6.368500, longitude: 106.892000 };

  // Case 1: Staff inside campus (15 meters away)
  const staffInside = { latitude: -6.368480, longitude: 106.892010 };
  const gfInside = checkGeofence(staffInside, campus, 100);
  console.log('✓ Geofence Test Inside (15m):', gfInside);
  if (!gfInside.isWithinRadius) throw new Error('Geofence test failed: should be inside');

  // Case 2: Staff outside campus (180 meters away)
  const staffOutside = { latitude: -6.370000, longitude: 106.893500 };
  const gfOutside = checkGeofence(staffOutside, campus, 100);
  console.log('✓ Geofence Test Outside (180m):', gfOutside);
  if (gfOutside.isWithinRadius) throw new Error('Geofence test failed: should be outside');

  // Case 3: Test 50m radius threshold change
  const gf50m = checkGeofence(staffInside, campus, 50);
  console.log('✓ Geofence Test 50m radius:', gf50m);
  if (!gf50m.isWithinRadius) throw new Error('Geofence 50m test failed');

  // Test password hashing and auth token
  const { verifyPassword, createSessionToken, verifySessionToken } = require('../src/lib/auth.ts');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('pegawai');
  const passOk = verifyPassword('password123', user.password_hash);
  console.log('✓ Password verification for pegawai:', passOk);
  if (!passOk) throw new Error('Password verification failed');

  const token = createSessionToken({ userId: user.id, username: user.username, role: user.role });
  const verified = verifySessionToken(token);
  console.log('✓ Session token created & verified for:', verified.username, '(Role:', verified.role + ')');
  if (!verified || verified.username !== 'pegawai') throw new Error('Token verification failed');

  // Test attendance calculation and date functions
  const { calculateLateness, getWIBDateString, getWIBTimeString } = require('../src/lib/date.ts');
  const lateCheck1 = calculateLateness('07:25:00', '07:30', 10);
  console.log('✓ Lateness Test on-time (07:25):', lateCheck1);
  if (lateCheck1.isLate) throw new Error('Should not be late');

  const lateCheck2 = calculateLateness('07:45:00', '07:30', 10);
  console.log('✓ Lateness Test late (07:45 with 10m grace):', lateCheck2);
  if (!lateCheck2.isLate || lateCheck2.minutesLate !== 15) throw new Error('Should be late by 15 min');

  console.log('✓ Current WIB Date:', getWIBDateString());
  console.log('✓ Current WIB Time:', getWIBTimeString());

  console.log('=== ALL BACKEND CORE LOGIC TESTS PASSED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
