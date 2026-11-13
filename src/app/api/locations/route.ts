import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const db = getDb();
    const locations = await db.prepare(`SELECT * FROM work_locations ORDER BY created_at ASC`).all();
    return NextResponse.json({ locations });
  } catch (err: any) {
    console.error('Locations GET error:', err);
    return NextResponse.json({ error: 'Gagal memuat data lokasi kerja' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { name, address, latitude, longitude, radiusMeters } = await req.json();

    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Nama lokasi dan koordinat latitude-longitude wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const id = `loc-${Date.now()}`;
    const now = new Date().toISOString();
    const radius = radiusMeters ? parseInt(radiusMeters, 10) : 100;

    await db.prepare(`
      INSERT INTO work_locations (id, name, address, latitude, longitude, radius_meters, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, address || '', latitude, longitude, radius, now);

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'CREATE_WORK_LOCATION',
      entityType: 'work_location',
      entityId: id,
      details: { name, latitude, longitude, radiusMeters: radius },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: 'Lokasi kerja baru berhasil ditambahkan', id });
  } catch (err: any) {
    console.error('Locations POST error:', err);
    return NextResponse.json({ error: 'Gagal menambahkan lokasi kerja' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id, name, address, latitude, longitude, radiusMeters, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID lokasi wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const current = await db.prepare(`SELECT * FROM work_locations WHERE id = ?`).get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 404 });
    }

    const radius = radiusMeters !== undefined ? parseInt(radiusMeters, 10) : current.radius_meters;
    const active = isActive !== undefined ? (isActive ? 1 : 0) : current.is_active;

    await db.prepare(`
      UPDATE work_locations SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        radius_meters = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      name || null,
      address || null,
      typeof latitude === 'number' ? latitude : null,
      typeof longitude === 'number' ? longitude : null,
      radius,
      active,
      id
    );

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'UPDATE_WORK_LOCATION',
      entityType: 'work_location',
      entityId: id,
      details: {
        previousRadius: current.radius_meters,
        newRadius: radius,
        previousCoord: `${current.latitude}, ${current.longitude}`,
        newCoord: `${latitude ?? current.latitude}, ${longitude ?? current.longitude}`,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: 'Pengaturan lokasi dan radius berhasil diperbarui' });
  } catch (err: any) {
    console.error('Locations PUT error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui lokasi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    let idToDelete = queryId;

    if (!idToDelete) {
      try {
        const body = await req.json();
        idToDelete = body.id;
      } catch {
        // No body
      }
    }

    if (!idToDelete) {
      return NextResponse.json({ error: 'ID lokasi wajib disertakan' }, { status: 400 });
    }

    const db = getDb();
    const current = await db.prepare(`SELECT * FROM work_locations WHERE id = ?`).get(idToDelete) as any;
    if (!current) {
      return NextResponse.json({ error: 'Lokasi kerja tidak ditemukan' }, { status: 404 });
    }

    await db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Clear foreign key references in attendance_records
      await db.prepare(`UPDATE attendance_records SET clock_in_location_id = NULL WHERE clock_in_location_id = ?`).run(idToDelete);
      await db.prepare(`UPDATE attendance_records SET clock_out_location_id = NULL WHERE clock_out_location_id = ?`).run(idToDelete);

      // 2. Remove from employee_allowed_locations
      await db.prepare(`DELETE FROM employee_allowed_locations WHERE location_id = ?`).run(idToDelete);

      // 3. Delete from work_locations
      await db.prepare(`DELETE FROM work_locations WHERE id = ?`).run(idToDelete);

      await db.exec('COMMIT;');
    } catch (txErr) {
      await db.exec('ROLLBACK;');
      throw txErr;
    }

    recordAuditLog({
      userId: user.userId,
      userName: user.name || user.username,
      action: 'DELETE_WORK_LOCATION',
      entityType: 'work_location',
      entityId: idToDelete,
      details: {
        name: current.name,
        coord: `${current.latitude}, ${current.longitude}`,
        radiusMeters: current.radius_meters,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Lokasi kerja "${current.name}" berhasil dihapus dari sistem.`,
    });
  } catch (err: any) {
    console.error('Locations DELETE error:', err);
    return NextResponse.json({ error: 'Gagal menghapus lokasi kerja' }, { status: 500 });
  }
}

