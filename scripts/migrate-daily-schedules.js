const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'data', 'absensi.db');
const db = new DatabaseSync(dbPath);

console.log('Migrating departments table to support daily schedules...');

// 1. Add daily_schedules column if not present
const cols = db.prepare('PRAGMA table_info(departments)').all();
const hasDaily = cols.some((c) => c.name === 'daily_schedules');
if (!hasDaily) {
  db.exec('ALTER TABLE departments ADD COLUMN daily_schedules TEXT;');
  console.log('Added column: daily_schedules');
} else {
  console.log('Column daily_schedules already exists.');
}

// 2. Helper to generate default daily schedule
function createDailySchedule(config) {
  const {
    monThu = { start: '07:30', end: '16:00', breakStart: '12:00', breakEnd: '13:00' },
    fri = { start: '07:30', end: '11:30', breakStart: null, breakEnd: null },
    sat = { active: false, start: '08:00', end: '12:00', breakStart: null, breakEnd: null },
    sun = { active: false, start: '08:00', end: '16:00', breakStart: null, breakEnd: null },
  } = config;

  return {
    Senin: { isActive: true, startTime: monThu.start, endTime: monThu.end, breakStart: monThu.breakStart, breakEnd: monThu.breakEnd },
    Selasa: { isActive: true, startTime: monThu.start, endTime: monThu.end, breakStart: monThu.breakStart, breakEnd: monThu.breakEnd },
    Rabu: { isActive: true, startTime: monThu.start, endTime: monThu.end, breakStart: monThu.breakStart, breakEnd: monThu.breakEnd },
    Kamis: { isActive: true, startTime: monThu.start, endTime: monThu.end, breakStart: monThu.breakStart, breakEnd: monThu.breakEnd },
    Jumat: { isActive: true, startTime: fri.start, endTime: fri.end, breakStart: fri.breakStart, breakEnd: fri.breakEnd },
    Sabtu: { isActive: sat.active, startTime: sat.start, endTime: sat.end, breakStart: sat.breakStart, breakEnd: sat.breakEnd },
    Minggu: { isActive: sun.active, startTime: sun.start, endTime: sun.end, breakStart: sun.breakStart, breakEnd: sun.breakEnd },
  };
}

const defaultSchedules = {
  'dept-1': createDailySchedule({
    monThu: { start: '07:15', end: '15:30', breakStart: '12:00', breakEnd: '13:00' },
    fri: { start: '07:15', end: '11:30' },
    sat: { active: false, start: '07:15', end: '12:00' }
  }),
  'dept-2': createDailySchedule({
    monThu: { start: '06:30', end: '14:30', breakStart: '11:30', breakEnd: '12:30' },
    fri: { start: '06:30', end: '11:30' },
    sat: { active: true, start: '07:00', end: '13:00' }
  }),
  'dept-3': createDailySchedule({
    monThu: { start: '08:00', end: '16:00', breakStart: '12:00', breakEnd: '13:00' },
    fri: { start: '08:00', end: '11:30' },
    sat: { active: false, start: '08:00', end: '12:00' }
  }),
  'dept-4': createDailySchedule({
    monThu: { start: '07:30', end: '16:00', breakStart: '12:00', breakEnd: '13:00' },
    fri: { start: '07:30', end: '11:30' },
    sat: { active: false, start: '08:00', end: '12:00' }
  }),
  'dept-5': createDailySchedule({
    monThu: { start: '07:00', end: '15:30', breakStart: '12:00', breakEnd: '13:00' },
    fri: { start: '07:00', end: '11:30' },
    sat: { active: false, start: '08:00', end: '12:00' }
  }),
  'dept-6': createDailySchedule({
    monThu: { start: '08:00', end: '16:30', breakStart: '12:00', breakEnd: '13:00' },
    fri: { start: '08:00', end: '11:30' },
    sat: { active: false, start: '08:00', end: '12:00' }
  }),
};

// Update existing departments
for (const [deptId, schedule] of Object.entries(defaultSchedules)) {
  const jsonStr = JSON.stringify(schedule);
  const activeDays = Object.entries(schedule)
    .filter(([_, cfg]) => cfg.isActive)
    .map(([day]) => day);

  db.prepare(`
    UPDATE departments SET
      daily_schedules = ?,
      work_days = ?
    WHERE id = ?
  `).run(jsonStr, JSON.stringify(activeDays), deptId);
  console.log(`Updated daily_schedules for ${deptId}: ${activeDays.length} active days`);
}

// For any other department that might not be in defaultSchedules, set standard default
const others = db.prepare(`SELECT id, start_time, end_time, work_days FROM departments WHERE daily_schedules IS NULL`).all();
for (const o of others) {
  const parsedWorkDays = typeof o.work_days === 'string' ? JSON.parse(o.work_days) : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const sched = {
    Senin: { isActive: parsedWorkDays.includes('Senin'), startTime: o.start_time || '07:30', endTime: o.end_time || '16:00' },
    Selasa: { isActive: parsedWorkDays.includes('Selasa'), startTime: o.start_time || '07:30', endTime: o.end_time || '16:00' },
    Rabu: { isActive: parsedWorkDays.includes('Rabu'), startTime: o.start_time || '07:30', endTime: o.end_time || '16:00' },
    Kamis: { isActive: parsedWorkDays.includes('Kamis'), startTime: o.start_time || '07:30', endTime: o.end_time || '16:00' },
    Jumat: { isActive: parsedWorkDays.includes('Jumat'), startTime: o.start_time || '07:30', endTime: '11:30' },
    Sabtu: { isActive: parsedWorkDays.includes('Sabtu'), startTime: '08:00', endTime: '12:00' },
    Minggu: { isActive: parsedWorkDays.includes('Minggu'), startTime: '08:00', endTime: '16:00' },
  };
  db.prepare(`UPDATE departments SET daily_schedules = ? WHERE id = ?`).run(JSON.stringify(sched), o.id);
  console.log(`Set fallback daily_schedules for ${o.id}`);
}

console.log('Migration completed successfully!');

