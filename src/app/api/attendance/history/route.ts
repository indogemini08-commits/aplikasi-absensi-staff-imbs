import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatIndonesianDate, formatIndonesianDateShort } from '@/lib/date';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // YYYY-MM
    const requestedEmpId = searchParams.get('employeeId');

    let targetEmployeeId = user.employeeId;
    if ((user.role === 'admin' || user.role === 'superadmin') && requestedEmpId) {
      targetEmployeeId = requestedEmpId;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 400 });
    }

    const db = getDb();
    
    // Determine month filter
    let dateFilter = '';
    const params: any[] = [targetEmployeeId];

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      dateFilter = ` AND strftime('%Y-%m', a.date) = ?`;
      params.push(monthParam);
    }

    const records = await db.prepare(`
      SELECT a.*,
             l1.name as in_location_name,
             l2.name as out_location_name,
             lr.reason as late_reason,
             lr.status as late_reason_status,
             lr.admin_notes as late_admin_notes
      FROM attendance_records a
      LEFT JOIN work_locations l1 ON a.clock_in_location_id = l1.id
      LEFT JOIN work_locations l2 ON a.clock_out_location_id = l2.id
      LEFT JOIN late_reasons lr ON a.id = lr.attendance_id
      WHERE a.employee_id = ? ${dateFilter}
      ORDER BY a.date DESC
    `).all(...params) as any[];

    // Monthly summary counts
    let totalHadir = 0;
    let totalTerlambat = 0;
    let totalPulangCepat = 0;

    for (const r of records) {
      if (r.clock_in_status === 'hadir') totalHadir++;
      if (r.clock_in_status === 'terlambat') totalTerlambat++;
      if (r.clock_out_status === 'pulang_cepat') totalPulangCepat++;
    }

    // Leave counts in this period
    let leaveQuery = `
      SELECT lr.*, lt.code, lt.name as type_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = ? AND lr.status = 'approved'
    `;
    const leaveParams: any[] = [targetEmployeeId];
    if (monthParam) {
      leaveQuery += ` AND (strftime('%Y-%m', lr.start_date) = ? OR strftime('%Y-%m', lr.end_date) = ?)`;
      leaveParams.push(monthParam, monthParam);
    }
    const approvedLeaves = await db.prepare(leaveQuery).all(...leaveParams) as any[];

    let totalCuti = 0;
    let totalSakit = 0;
    let totalIzin = 0;

    for (const l of approvedLeaves) {
      if (l.code === 'CUTI_TAHUNAN' || l.code.startsWith('CUTI')) {
        totalCuti += l.total_days;
      } else if (l.code.includes('SAKIT')) {
        totalSakit += l.total_days;
      } else {
        totalIzin += l.total_days;
      }
    }

    const formattedRecords = records.map((r) => ({
      id: r.id,
      date: r.date,
      formattedDate: formatIndonesianDate(r.date),
      shortDate: formatIndonesianDateShort(r.date),
      clockInTime: r.clock_in_time,
      clockInStatus: r.clock_in_status,
      clockInLocation: r.in_location_name,
      clockInDistance: r.clock_in_distance_meters,
      clockInAccuracy: r.clock_in_accuracy,
      minutesLate: r.clock_in_minutes_late,
      clockOutTime: r.clock_out_time,
      clockOutStatus: r.clock_out_status,
      clockOutLocation: r.out_location_name,
      lateReason: r.late_reason,
      lateReasonStatus: r.late_reason_status,
      lateAdminNotes: r.late_admin_notes,
    }));

    return NextResponse.json({
      records: formattedRecords,
      summary: {
        totalHadir,
        totalTerlambat,
        totalPulangCepat,
        totalCuti,
        totalSakit,
        totalIzin,
        totalKehadiran: totalHadir + totalTerlambat,
      },
    });
  } catch (err: any) {
    console.error('Attendance history error:', err);
    return NextResponse.json({ error: 'Gagal memuat riwayat absensi' }, { status: 500 });
  }
}

