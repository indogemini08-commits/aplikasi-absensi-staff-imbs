import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getWIBDateString, getWIBTimeString, calculateLateness, getIndonesianDayName } from '@/lib/date';
import { checkGeofence } from '@/lib/geo';
import { recordAuditLog } from '@/lib/audit';
import { notifyAdmins } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const body = await req.json();
    const {
      latitude,
      longitude,
      accuracy,
      locationId,
      photo,
      deviceInfo,
    } = body;

    // 1. Basic coordinate validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Koordinat lokasi tidak valid. Pastikan GPS aktif dan izin lokasi diberikan.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const today = getWIBDateString();
    const currentTime = getWIBTimeString();
    const nowISO = new Date().toISOString();

    // 2. Prevent duplicate clock in
    const existing = await db.prepare(`
      SELECT id, clock_in_time FROM attendance_records
      WHERE employee_id = ? AND date = ?
    `).get(user.employeeId, today) as any;

    if (existing && existing.clock_in_time) {
      return NextResponse.json(
        { error: `Anda sudah melakukan absensi masuk hari ini pada pukul ${existing.clock_in_time} WIB.` },
        { status: 400 }
      );
    }

    // 3. Settings & GPS Accuracy check
    const settingsRows = await db.prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[];
    const settings = settingsRows.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const maxAccuracy = parseFloat(settings.max_gps_accuracy_meters || '50');
    if (typeof accuracy === 'number' && accuracy > maxAccuracy) {
      return NextResponse.json(
        {
          error: `Akurasi sinyal GPS Anda saat ini ${Math.round(accuracy)} meter, belum memadai (maksimal ${maxAccuracy} meter). Silakan melangkah ke area terbuka dan refresh lokasi.`,
          accuracy,
          maxAccuracy,
        },
        { status: 400 }
      );
    }

    // 4. Fetch work location
    let targetLocation = null;
    if (locationId) {
      targetLocation = await db.prepare(`SELECT * FROM work_locations WHERE id = ? AND is_active = 1`).get(locationId) as any;
    }

    if (!targetLocation) {
      // Find nearest active location among employee's allowed locations
      const allowedLocations = await db.prepare(`
        SELECT wl.* FROM work_locations wl
        WHERE wl.is_active = 1
      `).all() as any[];

      if (allowedLocations.length === 0) {
        return NextResponse.json({ error: 'Tidak ada lokasi kerja aktif yang terdaftar di sistem.' }, { status: 400 });
      }

      // Check each to find if within radius, or choose the closest
      let closestLoc = allowedLocations[0];
      let minDistance = Infinity;

      for (const loc of allowedLocations) {
        const gf = checkGeofence(
          { latitude, longitude },
          { latitude: loc.latitude, longitude: loc.longitude },
          loc.radius_meters
        );
        if (gf.distanceMeters < minDistance) {
          minDistance = gf.distanceMeters;
          closestLoc = loc;
        }
      }
      targetLocation = closestLoc;
    }

    // 5. Geofence server-side validation
    const geofence = checkGeofence(
      { latitude, longitude },
      { latitude: targetLocation.latitude, longitude: targetLocation.longitude },
      targetLocation.radius_meters
    );

    if (!geofence.isWithinRadius) {
      return NextResponse.json(
        {
          error: `Anda berada di luar area absensi ${targetLocation.name}. Jarak ke lokasi kerja: ${geofence.formattedDistance}. Batas radius absensi: ${geofence.allowedRadius} meter.`,
          distanceMeters: geofence.distanceMeters,
          allowedRadius: geofence.allowedRadius,
          locationName: targetLocation.name,
        },
        { status: 403 }
      );
    }

    // 6. Check Department Schedule for today and calculate lateness
    const empDept = await db.prepare(`
      SELECT e.id, e.name, e.department_id,
             d.name as department_name, d.start_time, d.end_time, d.grace_period_minutes,
             d.work_days, d.daily_schedules
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

    const currentDayName = getIndonesianDayName(today);
    const todayConfig = dailySchedules?.[currentDayName];
    const scheduledStartTime = (todayConfig?.isActive && todayConfig.startTime)
      ? todayConfig.startTime
      : (empDept?.start_time || '07:30');

    const graceMinutes = empDept?.grace_period_minutes ?? parseInt(settings.grace_period_minutes || '10', 10);

    const lateness = calculateLateness(currentTime, scheduledStartTime, graceMinutes);
    const clockInStatus = lateness.isLate ? 'terlambat' : 'hadir';
    const minutesLate = lateness.minutesLate;

    // 7. Insert or update attendance record
    const attendanceId = existing ? existing.id : `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (existing) {
      await db.prepare(`
        UPDATE attendance_records SET
          clock_in_time = ?,
          clock_in_latitude = ?,
          clock_in_longitude = ?,
          clock_in_accuracy = ?,
          clock_in_distance_meters = ?,
          clock_in_location_id = ?,
          clock_in_photo = ?,
          clock_in_status = ?,
          clock_in_minutes_late = ?,
          shift_id = ?,
          device_info = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        currentTime,
        latitude,
        longitude,
        accuracy || null,
        geofence.distanceMeters,
        targetLocation.id,
        photo || null,
        clockInStatus,
        minutesLate,
        null,
        deviceInfo || 'Android Web Browser',
        nowISO,
        attendanceId
      );
    } else {
      await db.prepare(`
        INSERT INTO attendance_records (
          id, employee_id, date, clock_in_time, clock_in_latitude, clock_in_longitude,
          clock_in_accuracy, clock_in_distance_meters, clock_in_location_id, clock_in_photo,
          clock_in_status, clock_in_minutes_late, shift_id, device_info, is_verified, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?
        )
      `).run(
        attendanceId,
        user.employeeId,
        today,
        currentTime,
        latitude,
        longitude,
        accuracy || null,
        geofence.distanceMeters,
        targetLocation.id,
        photo || null,
        clockInStatus,
        minutesLate,
        null,
        deviceInfo || 'Android Web Browser',
        nowISO,
        nowISO
      );
    }

    // 8. Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CLOCK_IN',
      entityType: 'attendance',
      entityId: attendanceId,
      details: {
        time: currentTime,
        status: clockInStatus,
        minutesLate,
        distanceMeters: geofence.distanceMeters,
        location: targetLocation.name,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    // 9. If late, notify admins
    if (clockInStatus === 'terlambat') {
      notifyAdmins({
        title: 'Pegawai Terlambat Hadir',
        message: `${user.name} (${user.nip}) melakukan absen masuk pukul ${currentTime} WIB (terlambat ${minutesLate} menit).`,
        type: 'attendance',
        referenceId: attendanceId,
      });
    }

    return NextResponse.json({
      success: true,
      message: clockInStatus === 'terlambat'
        ? `Absen masuk berhasil dicatat pukul ${currentTime} WIB. Status: Terlambat ${minutesLate} menit. Silakan lengkapi formulir alasan keterlambatan.`
        : `Absen masuk berhasil dicatat pukul ${currentTime} WIB. Status: Tepat Waktu. Selamat bertugas!`,
      data: {
        attendanceId,
        clockInTime: currentTime,
        status: clockInStatus,
        minutesLate,
        distanceMeters: geofence.distanceMeters,
        locationName: targetLocation.name,
        requiresLateReason: clockInStatus === 'terlambat',
      },
    });
  } catch (err: any) {
    console.error('Clock-in error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses absensi masuk' },
      { status: 500 }
    );
  }
}

