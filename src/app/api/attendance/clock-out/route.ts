import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getWIBDateString, getWIBTimeString, getIndonesianDayName } from '@/lib/date';
import { checkGeofence } from '@/lib/geo';
import { recordAuditLog } from '@/lib/audit';

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

    // 1. Check existing record
    const record = await db.prepare(`
      SELECT * FROM attendance_records
      WHERE employee_id = ? AND date = ?
    `).get(user.employeeId, today) as any;

    if (!record || !record.clock_in_time) {
      return NextResponse.json(
        { error: 'Anda belum melakukan absen masuk hari ini. Silakan absen masuk terlebih dahulu.' },
        { status: 400 }
      );
    }

    if (record.clock_out_time) {
      return NextResponse.json(
        { error: `Anda sudah melakukan absen pulang hari ini pada pukul ${record.clock_out_time} WIB.` },
        { status: 400 }
      );
    }

    // 2. Target work location
    let targetLocation = null;
    if (locationId) {
      targetLocation = await db.prepare(`SELECT * FROM work_locations WHERE id = ? AND is_active = 1`).get(locationId) as any;
    }

    if (!targetLocation) {
      const allowedLocations = await db.prepare(`SELECT * FROM work_locations WHERE is_active = 1`).all() as any[];
      if (allowedLocations.length === 0) {
        return NextResponse.json({ error: 'Tidak ada lokasi kerja aktif yang terdaftar.' }, { status: 400 });
      }
      let closestLoc = allowedLocations[0];
      let minDistance = Infinity;
      for (const loc of allowedLocations) {
        const gf = checkGeofence({ latitude, longitude }, { latitude: loc.latitude, longitude: loc.longitude }, loc.radius_meters);
        if (gf.distanceMeters < minDistance) {
          minDistance = gf.distanceMeters;
          closestLoc = loc;
        }
      }
      targetLocation = closestLoc;
    }

    // 3. Geofence validation
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

    // 4. Check today's department schedule end time
    const empDept = await db.prepare(`
      SELECT e.id, d.end_time, d.daily_schedules
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
    const scheduledEndTime = (todayConfig?.isActive && todayConfig.endTime)
      ? todayConfig.endTime
      : (empDept?.end_time || '16:00');

    const isEarly = currentTime < scheduledEndTime;
    const clockOutStatus = isEarly ? 'pulang_cepat' : 'normal';

    // 5. Update attendance record
    await db.prepare(`
      UPDATE attendance_records SET
        clock_out_time = ?,
        clock_out_latitude = ?,
        clock_out_longitude = ?,
        clock_out_accuracy = ?,
        clock_out_distance_meters = ?,
        clock_out_location_id = ?,
        clock_out_photo = ?,
        clock_out_status = ?,
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
      clockOutStatus,
      nowISO,
      record.id
    );

    // 6. Audit log
    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CLOCK_OUT',
      entityType: 'attendance',
      entityId: record.id,
      details: {
        time: currentTime,
        status: clockOutStatus,
        distanceMeters: geofence.distanceMeters,
        location: targetLocation.name,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Absen pulang berhasil dicatat pukul ${currentTime} WIB. ${isEarly ? '(Catatan: Pulang lebih awal dari jam kerja resmi)' : 'Terima kasih atas kerja keras Anda hari ini!'}`,
      data: {
        attendanceId: record.id,
        clockOutTime: currentTime,
        status: clockOutStatus,
        distanceMeters: geofence.distanceMeters,
        locationName: targetLocation.name,
      },
    });
  } catch (err: any) {
    console.error('Clock-out error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses absensi pulang' },
      { status: 500 }
    );
  }
}

