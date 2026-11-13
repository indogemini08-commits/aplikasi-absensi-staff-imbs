async function testApi() {
  // Login first to get cookie
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'password123' })
  });

  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status, 'Cookie exists:', !!cookie);

  // Test recap API
  const recapRes = await fetch('http://localhost:3000/api/reports/recap?startDate=2026-08-01&endDate=2026-08-25', {
    headers: { Cookie: cookie || '' }
  });

  console.log('Recap API status:', recapRes.status);
  const data = await recapRes.json();
  console.log('Recap institution:', data.institution?.schoolName);
  console.log('Recap month:', data.monthName);
  console.log('Recap period:', data.periodFormatted);
  console.log('Recap summary count:', data.recapSummary?.length);
  if (data.recapSummary && data.recapSummary.length > 0) {
    console.log('First row:', data.recapSummary[0]);
    const aldri = data.recapSummary.find((s) => s.name.includes('Aldri'));
    console.log('Aldri row:', aldri);
  }
}

testApi().catch(console.error);
