import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getWIBDateString, getWIBTimeString, formatIndonesianDate, getIndonesianDayName } from '@/lib/date';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || getWIBDateString();
    const departmentId = searchParams.get('departmentId');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const db = getDb();
    const currentWIBTime = getWIBTimeString();
    const dayName = getIndonesianDayName(dateParam);

    // Build employees query
    let empQuery = `
      SELECT e.id as employee_id, e.nip, e.name, e.gender, e.position,
             d.id as department_id, d.name as department_name, d.code as department_code,
             d.start_time, d.end_time, d.grace_period_minutes, d.work_days, d.daily_schedules
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = 1
    `;
    const empParams: any[] = [];

    if (departmentId) {
      empQuery += ` AND e.department_id = ?`;
      empParams.push(departmentId);
    }

    if (search) {
      empQuery += ` AND (e.name LIKE ? OR e.nip LIKE ?)`;
      empParams.push(`%${search}%`, `%${search}%`);
    }

    empQuery += ` ORDER BY e.nip ASC, e.name ASC`;

    // Execute all independent queries concurrently in parallel
    const [holiday, employees, defaultShift, attendances, leaves] = await Promise.all([
      db.prepare(`SELECT * FROM holidays WHERE date = ?`).get(dateParam) as Promise<any>,
      db.prepare(empQuery).all(...empParams) as Promise<any[]>,
      db.prepare(`SELECT * FROM shift_templates WHERE is_default = 1 LIMIT 1`).get() as Promise<any>,
      db.prepare(`
        SELECT a.*, l.name as location_name
        FROM attendance_records a
        LEFT JOIN work_locations l ON a.clock_in_location_id = l.id
        WHERE a.date = ?
      `).all(dateParam) as Promise<any[]>,
      db.prepare(`
        SELECT lr.*, lt.code, lt.name as leave_name
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.status = 'approved' AND ? BETWEEN lr.start_date AND lr.end_date
      `).all(dateParam) as Promise<any[]>,
    ]);

    const attMap = new Map();
    for (const a of attendances) {
      attMap.set(a.employee_id, a);
    }

    const leaveMap = new Map();
    for (const l of leaves) {
      leaveMap.set(l.employee_id, l);
    }

    // Build monitoring board items
    let statBelumAbsen = 0;
    let statHadir = 0;
    let statTerlambat = 0;
    let statIzin = 0;
    let statCuti = 0;
    let statSakit = 0;
    let statPulang = 0;
    let statLibur = 0;

    const boardItems = [];

    for (const emp of employees) {
      let dailySchedules: any = null;
      if (emp.daily_schedules) {
        try {
          dailySchedules = typeof emp.daily_schedules === 'string' ? JSON.parse(emp.daily_schedules) : emp.daily_schedules;
        } catch {
          dailySchedules = null;
        }
      }

      const dayConfig = dailySchedules?.[dayName];
      const workDays: string[] = typeof emp.work_days === 'string' ? JSON.parse(emp.work_days) : (emp.work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
      const isWorkDay = dayConfig ? !!dayConfig.isActive : workDays.includes(dayName);

      const plannedIn = isWorkDay ? (dayConfig?.startTime || emp.start_time || '07:30') : '-';
      const plannedOut = isWorkDay ? (dayConfig?.endTime || emp.end_time || '16:00') : '-';
      const shiftName = `Jadwal ${emp.department_name} (${dayName})`;
      const gracePeriod = emp.grace_period_minutes ?? 10;

      const att = attMap.get(emp.employee_id);
      const leave = leaveMap.get(emp.employee_id);

      let status = 'Belum Absen';
      let statusColor = 'gray';
      let minutesLate = 0;
      let actualIn = att?.clock_in_time || null;
      let actualOut = att?.clock_out_time || null;
      let locationName = att?.location_name || null;

      if (holiday) {
        status = 'Libur';
        statusColor = 'purple';
        statLibur++;
      } else if (leave) {
        if (leave.code === 'CUTI_TAHUNAN' || leave.code.startsWith('CUTI')) {
          status = 'Cuti';
          statusColor = 'blue';
          statCuti++;
        } else if (leave.code.includes('SAKIT')) {
          status = 'Sakit';
          statusColor = 'amber';
          statSakit++;
        } else {
          status = 'Izin';
          statusColor = 'cyan';
          statIzin++;
        }
      } else if (att) {
        if (att.clock_out_time) {
          status = 'Pulang';
          statusColor = 'emerald';
          statPulang++;
        } else if (att.clock_in_status === 'terlambat') {
          status = 'Terlambat';
          statusColor = 'orange';
          minutesLate = att.clock_in_minutes_late || 0;
          statTerlambat++;
        } else {
          status = 'Hadir';
          statusColor = 'green';
          statHadir++;
        }
      } else if (!isWorkDay) {
        status = 'Libur Rutin';
        statusColor = 'purple';
        statLibur++;
      } else {
        // Not clocked in yet
        status = 'Belum Absen';
        statusColor = 'gray';
        statBelumAbsen++;
      }

      const item = {
        employeeId: emp.employee_id,
        name: emp.name,
        nip: emp.nip,
        gender: emp.gender,
        position: emp.position,
        departmentId: emp.department_id,
        departmentName: emp.department_name,
        shiftName,
        plannedIn,
        plannedOut,
        actualIn,
        actualOut,
        status,
        statusColor,
        minutesLate,
        locationName,
        attendanceId: att?.id || null,
      };

      if (!statusFilter || status.toLowerCase() === statusFilter.toLowerCase()) {
        boardItems.push(item);
      }
    }

    return NextResponse.json({
      date: dateParam,
      formattedDate: formatIndonesianDate(dateParam),
      dayName,
      isHoliday: !!holiday,
      holidayName: holiday?.name || null,
      currentTime: currentWIBTime,
      stats: {
        totalEmployees: employees.length,
        hadir: statHadir + statPulang, // currently in + clocked out
        terlambat: statTerlambat,
        belumAbsen: statBelumAbsen,
        izin: statIzin,
        cuti: statCuti,
        sakit: statSakit,
        pulang: statPulang,
        libur: statLibur,
      },
      board: boardItems,
    });
  } catch (err: any) {
    console.error('Schedule board error:', err);
    return NextResponse.json({ error: 'Gagal memuat papan jadwal kehadiran' }, { status: 500 });
  }
}

