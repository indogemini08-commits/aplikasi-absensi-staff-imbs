import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getWIBDateString, getWIBTimeString, getIndonesianDayName, formatIndonesianDate } from '@/lib/date';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const db = getDb();
    const today = getWIBDateString();
    const currentTime = getWIBTimeString();
    const currentDayName = getIndonesianDayName(today);

    // 1. Get employee department schedule (auto-inherited)
    const empDept = await db.prepare(`
      SELECT e.id, e.name, e.department_id,
             d.name as department_name, d.code as department_code,
             d.start_time, d.end_time, d.grace_period_minutes,
             d.work_days, d.daily_schedules, d.break_start, d.break_end
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `).get(user.employeeId) as any;

    let dailySchedules: any = null;
    if (empDept?.daily_schedules) {
      try {
        dailySchedules = typeof empDept.daily_schedules === 'string'
          ? JSON.parse(empDept.daily_schedules)
          : empDept.daily_schedules;
      } catch {
        dailySchedules = null;
      }
    }

    const workDays: string[] = empDept
      ? Array.isArray(empDept.work_days)
        ? empDept.work_days
        : typeof empDept.work_days === 'string'
        ? JSON.parse(empDept.work_days)
        : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
      : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

    // Check today's specific day configuration
    const todayConfig = dailySchedules?.[currentDayName];
    const isDepartmentWorkDay = todayConfig ? !!todayConfig.isActive : workDays.includes(currentDayName);
    const isDepartmentOffDay = !isDepartmentWorkDay;

    const todayStartTime = (todayConfig?.isActive && todayConfig.startTime) ? todayConfig.startTime : (empDept?.start_time || '07:30');
    const todayEndTime = (todayConfig?.isActive && todayConfig.endTime) ? todayConfig.endTime : (empDept?.end_time || '16:00');
    const todayBreakStart = todayConfig?.isActive ? todayConfig.breakStart : empDept?.break_start;
    const todayBreakEnd = todayConfig?.isActive ? todayConfig.breakEnd : empDept?.break_end;

    // 2. Check if today is a holiday
    const holiday = await db.prepare(`SELECT * FROM holidays WHERE date = ?`).get(today) as any;

    // 3. Check approved leave for today
    const leaveToday = await db.prepare(`
      SELECT lr.*, lt.name as leave_type_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = ? AND lr.status = 'approved' AND ? BETWEEN lr.start_date AND lr.end_date
    `).get(user.employeeId, today) as any;

    // 4. Get today's attendance record
    const attendance = await db.prepare(`
      SELECT a.*, l1.name as in_location_name, l2.name as out_location_name
      FROM attendance_records a
      LEFT JOIN work_locations l1 ON a.clock_in_location_id = l1.id
      LEFT JOIN work_locations l2 ON a.clock_out_location_id = l2.id
      WHERE a.employee_id = ? AND a.date = ?
    `).get(user.employeeId, today) as any;

    // 5. Check if late reason is pending
    let lateReason = null;
    let pendingLateReason = false;
    if (attendance && attendance.clock_in_status === 'terlambat') {
      lateReason = await db.prepare(`
        SELECT * FROM late_reasons WHERE attendance_id = ?
      `).get(attendance.id) as any;
      if (!lateReason) {
        pendingLateReason = true;
      }
    }

    // 6. Get allowed work locations for this employee
    let allowedLocations = await db.prepare(`
      SELECT wl.*
      FROM employee_allowed_locations eal
      JOIN work_locations wl ON eal.location_id = wl.id
      WHERE eal.employee_id = ? AND wl.is_active = 1
    `).all(user.employeeId) as any[];

    // If no specific restrictions, give all active work locations
    if (allowedLocations.length === 0) {
      allowedLocations = await db.prepare(`
        SELECT * FROM work_locations WHERE is_active = 1
      `).all() as any[];
    }

    // 7. Get app settings (grace period, selfie requirement, max gps accuracy)
    const settingsRows = await db.prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[];
    const settings = settingsRows.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      today,
      formattedDate: formatIndonesianDate(today),
      currentTime,
      dayName: currentDayName,
      isHoliday: !!holiday,
      holiday: holiday ? { name: holiday.name, type: holiday.type } : null,
      isLeaveToday: !!leaveToday,
      leaveToday: leaveToday ? { type: leaveToday.leave_type_name, reason: leaveToday.reason } : null,
      schedule: empDept ? {
        shiftName: `Jadwal ${empDept.department_name} (${currentDayName})`,
        departmentName: empDept.department_name,
        departmentCode: empDept.department_code,
        startTime: todayStartTime,
        endTime: todayEndTime,
        graceMinutes: empDept.grace_period_minutes ?? 10,
        breakStart: todayBreakStart,
        breakEnd: todayBreakEnd,
        workDays,
        dailySchedules,
        isWorkDay: isDepartmentWorkDay,
        isDepartmentOffDay,
      } : null,
      isDepartmentOffDay,
      attendance: attendance ? {
        id: attendance.id,
        clockInTime: attendance.clock_in_time,
        clockInStatus: attendance.clock_in_status,
        minutesLate: attendance.clock_in_minutes_late,
        clockInLocation: attendance.in_location_name,
        clockInDistance: attendance.clock_in_distance_meters,
        clockOutTime: attendance.clock_out_time,
        clockOutStatus: attendance.clock_out_status,
        clockOutLocation: attendance.out_location_name,
        isClockedIn: !!attendance.clock_in_time,
        isClockedOut: !!attendance.clock_out_time,
      } : {
        id: null,
        isClockedIn: false,
        isClockedOut: false,
      },
      lateReason,
      pendingLateReason,
      allowedLocations,
      settings: {
        requireSelfie: settings.require_selfie === '1',
        maxGpsAccuracy: parseInt(settings.max_gps_accuracy_meters || '50', 10),
        gracePeriodMinutes: parseInt(settings.grace_period_minutes || '10', 10),
      },
    });
  } catch (err: any) {
    console.error('Attendance status error:', err);
    return NextResponse.json({ error: 'Gagal memuat status absensi' }, { status: 500 });
  }
}

