const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'absensi.db'));

console.log('Cleaning dummy audit logs...');
db.prepare(`
  DELETE FROM audit_logs
  WHERE user_name IN (
    'Dr. H. Ahmad Fauzi, M.Pd.',
    'Budi Pratama, S.Pd.',
    'Siti Nurhaliza, S.Psi.',
    'Fajar Hidayat, S.Kom.',
    'Dewi Lestari, S.E.',
    'Hendra Saputra, A.Md.',
    'Ustadzah Rahmawati, S.Ag.'
  )
`).run();

// Clean audit logs where user_id references old dummy users
db.prepare(`
  DELETE FROM audit_logs
  WHERE user_id IN ('usr-pegawai', 'usr-rahma', 'usr-fajar', 'usr-dewi', 'usr-hendra')
`).run();

// Add clean official audit logs
const now = new Date().toISOString();
const insertAudit = db.prepare(`
  INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertAudit.run(
  'aud-imbs-init',
  'usr-superadmin',
  'ALDRI WAHYUDI CHANDRA',
  'INITIALIZE_SYSTEM',
  'system',
  'root',
  JSON.stringify({ message: 'Konfigurasi sistem presensi resmi IMBS Yayasan Sabilul Huda Nambo aktif.' }),
  '127.0.0.1',
  '2026-08-01T07:00:00.000Z'
);

insertAudit.run(
  'aud-imbs-dept',
  'usr-admin',
  'Ustadz Fauzan Azhiimaa, Lc',
  'UPDATE_DEPARTMENT_SCHEDULES',
  'department',
  'all',
  JSON.stringify({ message: 'Jadwal kerja 13 departemen resmi IMBS ditetapkan 6 hari kerja (Senin - Sabtu).' }),
  '127.0.0.1',
  '2026-08-01T07:15:00.000Z'
);

insertAudit.run(
  'aud-imbs-loc',
  'usr-superadmin',
  'ALDRI WAHYUDI CHANDRA',
  'CONFIGURE_GEOFENCE_LOCATION',
  'work_location',
  'loc-1794539027625',
  JSON.stringify({ name: 'Kampus IMBS Tamansari Bogor', lat: -6.6432, lng: 106.7725, radius: 100 }),
  '127.0.0.1',
  '2026-08-01T07:30:00.000Z'
);

console.log('Audit logs cleaned and refreshed!');
const count = db.prepare('SELECT count(*) as c FROM audit_logs').get();
console.log('Total audit logs now:', count.c);
const logs = db.prepare('SELECT id, user_name, action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent audit logs:', logs);
