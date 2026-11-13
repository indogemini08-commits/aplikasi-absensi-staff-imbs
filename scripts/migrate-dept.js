const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'absensi.db');
const db = new DatabaseSync(dbPath);

try { db.exec("ALTER TABLE departments ADD COLUMN start_time TEXT NOT NULL DEFAULT '07:30';"); } catch(e){}
try { db.exec("ALTER TABLE departments ADD COLUMN end_time TEXT NOT NULL DEFAULT '16:00';"); } catch(e){}
try { db.exec("ALTER TABLE departments ADD COLUMN grace_period_minutes INTEGER NOT NULL DEFAULT 10;"); } catch(e){}
try { db.exec("ALTER TABLE departments ADD COLUMN work_days TEXT NOT NULL DEFAULT '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\"]';"); } catch(e){}
try { db.exec("ALTER TABLE departments ADD COLUMN break_start TEXT DEFAULT '12:00';"); } catch(e){}
try { db.exec("ALTER TABLE departments ADD COLUMN break_end TEXT DEFAULT '13:00';"); } catch(e){}

// Set department specific schedules
db.prepare("UPDATE departments SET start_time = '07:15', end_time = '15:30', grace_period_minutes = 10, work_days = '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\"]' WHERE id = 'dept-1'").run();
db.prepare("UPDATE departments SET start_time = '06:30', end_time = '14:30', grace_period_minutes = 10, work_days = '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\",\"Sabtu\"]' WHERE id = 'dept-2'").run();
db.prepare("UPDATE departments SET start_time = '08:00', end_time = '16:00', grace_period_minutes = 10, work_days = '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\"]' WHERE id = 'dept-3'").run();
db.prepare("UPDATE departments SET start_time = '07:30', end_time = '16:00', grace_period_minutes = 10, work_days = '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\"]' WHERE id = 'dept-4'").run();
db.prepare("UPDATE departments SET start_time = '07:00', end_time = '15:30', grace_period_minutes = 15, work_days = '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\"]' WHERE id = 'dept-5'").run();
db.prepare("UPDATE departments SET start_time = '08:00', end_time = '16:30', grace_period_minutes = 10, work_days = '[\"Senin\",\"Selasa\",\"Rabu\",\"Kamis\",\"Jumat\"]' WHERE id = 'dept-6'").run();

console.log('✓ Departments schema migrated and configured successfully:');
const rows = db.prepare('SELECT id, name, code, start_time, end_time, grace_period_minutes, work_days FROM departments').all();
console.log(rows);

