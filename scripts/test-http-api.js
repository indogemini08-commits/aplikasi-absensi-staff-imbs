const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json: () => {
            try {
              return JSON.parse(body);
            } catch {
              return null;
            }
          },
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- TESTING HTTP API ENDPOINTS ---');
  const port = process.env.PORT || 3000;

  // 1. Check unauthenticated /api/auth/me
  console.log('1. Testing /api/auth/me without cookie...');
  const res1 = await request({
    hostname: 'localhost',
    port,
    path: '/api/auth/me',
    method: 'GET',
  });
  console.log('Status:', res1.status);
  if (res1.status !== 401) throw new Error('Expected 401 for unauthenticated request');
  console.log('✓ Unauthenticated blocked properly');

  // 2. Login as pegawai
  console.log('\n2. Testing /api/auth/login as pegawai...');
  const res2 = await request(
    {
      hostname: 'localhost',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'pegawai', password: 'password123' }
  );
  console.log('Status:', res2.status);
  const data2 = res2.json();
  console.log('Login result:', data2?.user?.name, 'Role:', data2?.user?.role);
  if (res2.status !== 200 || !data2?.success) throw new Error('Login failed');

  // Extract session cookie
  const cookieHeader = res2.headers['set-cookie'];
  const sessionCookie = cookieHeader ? cookieHeader[0].split(';')[0] : '';
  console.log('✓ Session Cookie received:', sessionCookie.substring(0, 30) + '...');

  // 3. Check /api/auth/me with cookie
  console.log('\n3. Testing /api/auth/me with session cookie...');
  const res3 = await request({
    hostname: 'localhost',
    port,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Cookie: sessionCookie },
  });
  console.log('Status:', res3.status);
  const data3 = res3.json();
  console.log('Logged in user:', data3?.user?.name, 'NIP:', data3?.user?.nip);
  if (res3.status !== 200 || !data3?.authenticated) throw new Error('Auth check failed');
  console.log('✓ Authenticated session valid');

  // 4. Check /api/attendance/status
  console.log('\n4. Testing /api/attendance/status...');
  const res4 = await request({
    hostname: 'localhost',
    port,
    path: '/api/attendance/status',
    method: 'GET',
    headers: { Cookie: sessionCookie },
  });
  console.log('Status:', res4.status);
  const data4 = res4.json();
  console.log('Today:', data4?.today, 'WIB Time:', data4?.currentTime);
  console.log('Schedule:', data4?.schedule?.shiftName, `(${data4?.schedule?.startTime} - ${data4?.schedule?.endTime} WIB)`);
  console.log('Is Clocked In:', data4?.attendance?.isClockedIn);
  if (res4.status !== 200) throw new Error('Status failed');
  console.log('✓ Attendance status valid');

  // 5. Test Clock-In OUTSIDE radius (Simulating staff 500m away)
  console.log('\n5. Testing Clock-In with coordinates OUTSIDE radius...');
  const res5 = await request(
    {
      hostname: 'localhost',
      port,
      path: '/api/attendance/clock-in',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
    },
    {
      latitude: -6.375000,
      longitude: 106.899000,
      accuracy: 10,
      locationId: data4?.allowedLocations[0]?.id,
    }
  );
  console.log('Status:', res5.status);
  const data5 = res5.json();
  console.log('Response Error:', data5?.error);
  if (res5.status !== 403) throw new Error('Expected 403 for out-of-bounds clock-in');
  console.log('✓ Server-side Geofence correctly BLOCKED attendance outside radius!');

  // 6. Test Clock-In INSIDE radius (At Campus center: -6.368500, 106.892000)
  console.log('\n6. Testing Clock-In with coordinates INSIDE radius...');
  const res6 = await request(
    {
      hostname: 'localhost',
      port,
      path: '/api/attendance/clock-in',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
    },
    {
      latitude: -6.368505,
      longitude: 106.892005,
      accuracy: 8.5,
      locationId: data4?.allowedLocations[0]?.id,
    }
  );
  console.log('Status:', res6.status);
  const data6 = res6.json();
  console.log('Message:', data6?.message);
  console.log('Data:', data6?.data);
  if (res6.status !== 200 || !data6?.success) throw new Error('Clock-in inside radius failed');
  console.log('✓ Clock-In succeeded inside radius!');

  // 7. Login as Admin
  console.log('\n7. Testing Login as Admin...');
  const resAdmin = await request(
    {
      hostname: 'localhost',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'admin', password: 'password123' }
  );
  const adminCookieHeader = resAdmin.headers['set-cookie'];
  const adminCookie = adminCookieHeader ? adminCookieHeader[0].split(';')[0] : '';

  // 8. Test Papan Jadwal Kehadiran (Board)
  console.log('\n8. Testing Papan Jadwal Kehadiran (/api/schedules/board)...');
  const resBoard = await request({
    hostname: 'localhost',
    port,
    path: '/api/schedules/board',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  console.log('Status:', resBoard.status);
  const dataBoard = resBoard.json();
  console.log('Board Stats:', dataBoard?.stats);
  console.log('Board Items Count:', dataBoard?.board?.length);
  const budiInBoard = dataBoard?.board?.find((b) => b.nip === 'IMBS-101');
  console.log('Budi in Board:', budiInBoard?.name, 'Status:', budiInBoard?.status, 'Actual In:', budiInBoard?.actualIn);
  if (resBoard.status !== 200 || !budiInBoard) throw new Error('Board check failed');
  console.log('✓ Papan Jadwal Kehadiran accurately reflects live attendance!');

  // 9. Test CSV Export Report
  console.log('\n9. Testing CSV Export (/api/reports/recap?format=csv)...');
  const resCsv = await request({
    hostname: 'localhost',
    port,
    path: `/api/reports/recap?startDate=${data4.today}&endDate=${data4.today}&format=csv`,
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  console.log('Status:', resCsv.status);
  console.log('Content-Type:', resCsv.headers['content-type']);
  console.log('Content-Disposition:', resCsv.headers['content-disposition']);
  console.log('CSV Lines count:', resCsv.body.split('\n').length);
  if (resCsv.status !== 200 || !resCsv.headers['content-type'].includes('text/csv')) {
    throw new Error('CSV export failed');
  }
  console.log('✓ CSV Export correctly downloaded with Excel-compatible headers!');

  console.log('\n========================================');
  console.log('🎉 ALL 9 CRITICAL INTEGRATION TESTS PASSED!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

