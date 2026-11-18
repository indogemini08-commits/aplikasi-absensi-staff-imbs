import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getWIBDateString } from '@/lib/date';

const INDO_MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function determinePredikat(
  masuk: number,
  pulang: number,
  telat: number,
  cepat: number,
  lupa: number,
  alpha: number,
  totalDays: number
): string {
  // Heavy disciplinary infractions -> Buruk
  if (lupa >= 8 || alpha >= 6 || masuk < 5 || telat >= 14) {
    return 'Buruk';
  }
  const attRate = totalDays > 0 ? (masuk / totalDays) : 0;
  if (attRate >= 0.85 && telat <= 3 && lupa <= 3 && alpha <= 3) {
    return 'Sangat Baik';
  }
  if (attRate >= 0.70 && lupa <= 3 && alpha <= 5) {
    return 'Baik';
  }
  return 'Kurang Baik';
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || '2026-08-01';
    const endDate = searchParams.get('endDate') || '2026-08-25';
    const departmentId = searchParams.get('departmentId');
    const employeeId = searchParams.get('employeeId');
    const format = searchParams.get('format'); // 'csv', 'csv-summary', or json

    const db = getDb();

    // 1. Fetch real institution settings from database
    const settingsRows = await db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const s of settingsRows) {
      settings[s.key] = s.value;
    }

    const institution = {
      govName: settings['gov_name'] || 'PEMERINTAH DAERAH KABUPATEN BOGOR',
      foundationName: settings['foundation_name'] || 'YAYASAN SABILUL HUDA NAMBO',
      schoolName: settings['organization_name'] || 'IMAM MUZANI BOARDING SCHOOL',
      address: settings['organization_address'] || 'Jl. Dukuh Manis Kp. Nambo RT.04 RW.01 Ds. Sukajaya, Kec. Tamansari, Kab. Bogor, Jawa Barat, 16610',
      contact: `E-Mail: ${settings['organization_email'] || 'imammuzanibs@gmail.com'}   No Telepon : ${settings['organization_phone'] || '0852 8242 4628'}`,
      email: settings['organization_email'] || 'imammuzanibs@gmail.com',
      phone: settings['organization_phone'] || '0852 8242 4628',
      headmaster: settings['headmaster_name'] || 'Fauzan Azhiimaa, Lc',
      headmasterTitle: settings['headmaster_title'] || 'Kepala Sekolah',
      headmasterNip: settings['headmaster_nip'] || '—',
      tuStaff: settings['tu_name'] || 'ALDRI WAHYUDI CHANDRA',
      tuStaffTitle: settings['tu_title'] || 'Petugas Tata Usaha',
      tuStaffNip: settings['tu_nip'] || '—',
      logoInstitution: settings['logo_institution'] || '',
      logoFoundation: settings['logo_foundation'] || '',
      logoApp: settings['logo_app'] || '',
    };

    // 2. Compute date range & month name
    const endObj = new Date(`${endDate}T12:00:00Z`);
    const monthName = INDO_MONTHS[endObj.getUTCMonth()] || 'AGUSTUS';

    // List of calendar days between startDate and endDate
    const allDatesInRange: string[] = [];
    let curDate = new Date(`${startDate}T12:00:00Z`);
    const stopDate = new Date(`${endDate}T12:00:00Z`);
    while (curDate <= stopDate) {
      allDatesInRange.push(curDate.toISOString().split('T')[0]);
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }

    // 3. Raw records query (for daily logs)
    let query = `
      SELECT a.*,
             e.name as employee_name,
             e.nip as employee_nip,
             d.name as department_name,
             l1.name as in_location_name,
             l2.name as out_location_name,
             lr.reason as late_reason,
             lr.status as late_reason_status
      FROM attendance_records a
      JOIN employees e ON a.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_locations l1 ON a.clock_in_location_id = l1.id
      LEFT JOIN work_locations l2 ON a.clock_out_location_id = l2.id
      LEFT JOIN late_reasons lr ON a.id = lr.attendance_id
      WHERE a.date BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (departmentId) {
      query += ` AND e.department_id = ?`;
      params.push(departmentId);
    }

    if (employeeId) {
      query += ` AND a.employee_id = ?`;
      params.push(employeeId);
    }

    query += ` ORDER BY a.date DESC, e.name ASC`;
    const records = await db.prepare(query).all(...params) as any[];

    // Calculate aggregated overall statistics
    let totalHadir = 0;
    let totalTerlambat = 0;
    let totalPulangCepat = 0;
    let totalMenitTerlambat = 0;

    for (const r of records) {
      if (r.clock_in_status === 'hadir') totalHadir++;
      if (r.clock_in_status === 'terlambat') {
        totalTerlambat++;
        totalMenitTerlambat += r.clock_in_minutes_late || 0;
      }
      if (r.clock_out_status === 'pulang_cepat') totalPulangCepat++;
    }

    // 4. Generate Employee Recap Summary - PURE DYNAMIC QUERY FROM REAL DATABASE
    let empQuery = `
      SELECT e.id, e.name, e.nip, e.position, e.sort_order, d.id as department_id, d.name as department_name,
             d.work_days, d.daily_schedules
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = 1
    `;
    const empParams: any[] = [];
    if (departmentId) {
      empQuery += ` AND e.department_id = ?`;
      empParams.push(departmentId);
    }
    if (employeeId) {
      empQuery += ` AND e.id = ?`;
      empParams.push(employeeId);
    }

    // Sort order: prioritized by global custom sort_order, then NIP
    empQuery += ` ORDER BY COALESCE(e.sort_order, 999999) ASC, e.nip ASC, e.name ASC`;
    let activeEmployees = await db.prepare(empQuery).all(...empParams) as any[];

    // Fetch custom order from app_settings for global single source of truth
    const customOrderMap = new Map<string, number>();
    try {
      const orderSetting = (await db.prepare(`SELECT value FROM app_settings WHERE key = 'employees_custom_order'`).get()) as any;
      if (orderSetting && orderSetting.value) {
        const orderedIds: string[] = typeof orderSetting.value === 'string' ? JSON.parse(orderSetting.value) : orderSetting.value;
        if (Array.isArray(orderedIds)) {
          orderedIds.forEach((id, idx) => customOrderMap.set(id, idx + 1));
        }
      }
    } catch {}

    // Ensure strict sort by customOrderMap / sort_order
    activeEmployees.sort((a, b) => {
      const orderA = customOrderMap.get(a.id) ?? (typeof a.sort_order === 'number' && a.sort_order > 0 ? a.sort_order : 999999);
      const orderB = customOrderMap.get(b.id) ?? (typeof b.sort_order === 'number' && b.sort_order > 0 ? b.sort_order : 999999);
      if (orderA !== orderB) return orderA - orderB;
      return (a.nip || '').localeCompare(b.nip || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    // Index attendance records by employee_id
    const empRecordsMap = new Map<string, any[]>();
    for (const r of records) {
      const list = empRecordsMap.get(r.employee_id) || [];
      list.push(r);
      empRecordsMap.set(r.employee_id, list);
    }

    // Query approved leave requests in date range for all employees
    const allApprovedLeaves = await db.prepare(`
      SELECT lr.employee_id, lr.start_date, lr.end_date, lr.total_days,
             lt.code as leave_code, lt.name as leave_name
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.status = 'approved'
        AND lr.start_date <= ? AND lr.end_date >= ?
    `).all(endDate, startDate) as any[];

    const empTotalLeavesMap = new Map<string, number>();
    const empIzinMap = new Map<string, number>();
    const empSakitMap = new Map<string, number>();

    for (const l of allApprovedLeaves) {
      const days = Number(l.total_days) || 1;
      const code = (l.leave_code || '').toUpperCase();
      const name = (l.leave_name || '').toLowerCase();

      // Total approved days
      const curTotal = empTotalLeavesMap.get(l.employee_id) || 0;
      empTotalLeavesMap.set(l.employee_id, curTotal + days);

      if (code.includes('IZIN') || name.includes('izin')) {
        const curIzin = empIzinMap.get(l.employee_id) || 0;
        empIzinMap.set(l.employee_id, curIzin + days);
      } else if (code.includes('SAKIT') || name.includes('sakit')) {
        const curSakit = empSakitMap.get(l.employee_id) || 0;
        empSakitMap.set(l.employee_id, curSakit + days);
      }
    }

    const recapSummary = activeEmployees.map((emp, index) => {
      const empRecords = empRecordsMap.get(emp.id) || [];

      let total_masuk = 0;
      let total_pulang = 0;
      let total_telat = 0;
      let total_pulang_cepat = 0;
      let total_lupa_pulang = 0;

      for (const r of empRecords) {
        if (r.clock_in_time) total_masuk++;
        if (r.clock_out_time) total_pulang++;
        if (r.clock_in_status === 'terlambat') total_telat++;
        if (r.clock_out_status === 'pulang_cepat') total_pulang_cepat++;
        if (r.clock_in_time && !r.clock_out_time) total_lupa_pulang++;
      }

      // Calculate scheduled workdays from employee department config
      let scheduledWorkDays = 0;
      let activeDaysList: string[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      try {
        if (emp.work_days) {
          activeDaysList = JSON.parse(emp.work_days);
        }
      } catch {}

      for (const dateStr of allDatesInRange) {
        const dObj = new Date(`${dateStr}T12:00:00Z`);
        const dayName = INDO_DAYS[dObj.getUTCDay()];
        if (activeDaysList.includes(dayName)) {
          scheduledWorkDays++;
        }
      }

      if (scheduledWorkDays === 0) scheduledWorkDays = allDatesInRange.length;

      // Subtract approved duty / leave days from database
      const approvedDutyDays = empTotalLeavesMap.get(emp.id) || 0;
      const total_izin = empIzinMap.get(emp.id) || 0;
      const total_sakit = empSakitMap.get(emp.id) || 0;
      const total_tidak_hadir = Math.max(0, scheduledWorkDays - total_masuk - approvedDutyDays);

      const predikat = determinePredikat(
        total_masuk,
        total_pulang,
        total_telat,
        total_pulang_cepat,
        total_lupa_pulang,
        total_tidak_hadir,
        scheduledWorkDays
      );

      return {
        no: index + 1,
        employee_id: emp.id,
        name: emp.name,
        nip: emp.nip,
        department_name: emp.department_name,
        position: emp.position,
        total_masuk,
        total_pulang,
        total_telat,
        total_pulang_cepat,
        total_lupa_pulang,
        total_izin,
        total_sakit,
        total_tidak_hadir,
        predikat,
      };
    });

    // 5. CSV Exports
    if (format === 'csv') {
      const headers = [
        'Tanggal',
        'NIP',
        'Nama Pegawai',
        'Divisi',
        'Jam Masuk (WIB)',
        'Status Masuk',
        'Keterlambatan (Menit)',
        'Lokasi Masuk',
        'Jarak Masuk (m)',
        'Jam Pulang (WIB)',
        'Status Pulang',
        'Lokasi Pulang',
        'Alasan Terlambat',
        'Status Peninjauan Alasan',
      ];

      const csvRows = [headers.join(',')];

      for (const r of records) {
        const row = [
          `"${r.date}"`,
          `"${r.employee_nip}"`,
          `"${r.employee_name}"`,
          `"${r.department_name}"`,
          `"${r.clock_in_time || '-'}"`,
          `"${r.clock_in_status === 'terlambat' ? 'Terlambat' : (r.clock_in_time ? 'Hadir Tepat Waktu' : '-')}"`,
          `"${r.clock_in_minutes_late || 0}"`,
          `"${r.in_location_name || '-'}"`,
          `"${r.clock_in_distance_meters ? Math.round(r.clock_in_distance_meters) : '-'}"`,
          `"${r.clock_out_time || '-'}"`,
          `"${r.clock_out_status === 'pulang_cepat' ? 'Pulang Cepat' : (r.clock_out_time ? 'Normal' : '-')}"`,
          `"${r.out_location_name || '-'}"`,
          `"${(r.late_reason || '').replace(/"/g, '""')}"`,
          `"${r.late_reason_status || '-'}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Laporan_Kehadiran_IMBS_${startDate}_sd_${endDate}.csv"`,
        },
      });
    }

    if (format === 'csv-summary') {
      const headers = [
        'No',
        'Nama Pegawai',
        'Departemen',
        'Masuk (Kali)',
        'Pulang (Kali)',
        'Telat (Kali)',
        'Pulang Lebih Awal (Kali)',
        'Lupa Absen Pulang (Kali)',
        'Izin (Hari)',
        'Sakit (Hari)',
        'Tidak Hadir (Kali)',
        'Predikat',
      ];

      const csvRows = [headers.join(',')];

      for (const s of recapSummary) {
        const row = [
          `"${s.no}"`,
          `"${s.name}"`,
          `"${s.department_name}"`,
          `"${s.total_masuk}"`,
          `"${s.total_pulang}"`,
          `"${s.total_telat}"`,
          `"${s.total_pulang_cepat}"`,
          `"${s.total_lupa_pulang}"`,
          `"${s.total_izin || 0}"`,
          `"${s.total_sakit || 0}"`,
          `"${s.total_tidak_hadir}"`,
          `"${s.predikat}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Rekap_Kehadiran_IMBS_${startDate}_sd_${endDate}.csv"`,
        },
      });
    }

    // Format Period string, e.g. "01 Agustus – 25 Agustus 2026"
    const [sY, sM, sD] = startDate.split('-');
    const [eY, eM, eD] = endDate.split('-');
    const startMName = INDO_MONTHS[parseInt(sM, 10) - 1] || '';
    const endMName = INDO_MONTHS[parseInt(eM, 10) - 1] || '';
    const capStartM = startMName.charAt(0) + startMName.slice(1).toLowerCase();
    const capEndM = endMName.charAt(0) + endMName.slice(1).toLowerCase();

    let periodFormatted = `${sD} ${capStartM} ${sY} – ${eD} ${capEndM} ${eY}`;
    if (sY === eY && sM === eM) {
      periodFormatted = `${sD} ${capStartM} – ${eD} ${capEndM} ${eY}`;
    }

    const formattedSignDate = `${parseInt(eD, 10)} ${capEndM} ${eY}`;

    return NextResponse.json(
      {
        startDate,
        endDate,
        formattedStartDate: `${sD} ${capStartM} ${sY}`,
        formattedEndDate: formattedSignDate,
        periodFormatted,
        monthName,
        institution,
        records,
        recapSummary,
        stats: {
          totalRecords: records.length,
          totalEmployees: activeEmployees.length,
          totalHadir,
          totalTerlambat,
          totalPulangCepat,
          totalMenitTerlambat,
          persentaseKehadiranTepat: records.length > 0 ? Math.round((totalHadir / records.length) * 100) : 100,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    console.error('Reports recap error:', err);
    return NextResponse.json({ error: 'Gagal memuat rekap laporan' }, { status: 500 });
  }
}
