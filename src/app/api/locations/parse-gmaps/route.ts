import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { parseGoogleMapsCoordinates } from '@/lib/geo-parser';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
    }

    const body = await req.json();
    const { input, searchMode } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input tidak boleh kosong' }, { status: 400 });
    }

    const trimmed = input.trim();

    // 1. Direct regex parsing first (fast, synchronous, works offline)
    const directResult = parseGoogleMapsCoordinates(trimmed);
    if (directResult) {
      return NextResponse.json({
        success: true,
        latitude: directResult.latitude,
        longitude: directResult.longitude,
        source: directResult.source,
      });
    }

    // 2. If it's a shortlink (maps.app.goo.gl or goo.gl/maps), resolve redirect
    if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
      try {
        const resp = await fetch(trimmed, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        const finalUrl = resp.url;
        const resolvedResult = parseGoogleMapsCoordinates(finalUrl);
        if (resolvedResult) {
          return NextResponse.json({
            success: true,
            latitude: resolvedResult.latitude,
            longitude: resolvedResult.longitude,
            source: 'google_maps_shortlink',
            finalUrl,
          });
        }
      } catch (e: any) {
        console.error('Failed to resolve shortlink:', e);
      }
    }

    // 3. Search Mode: Geocoding search (OpenStreetMap Nominatim)
    if (searchMode || !trimmed.startsWith('http')) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5&countrycodes=id`;
        const geoRes = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'Aplikasi-Absensi-Staff-IMBS/1.0',
          },
        });

        if (geoRes.ok) {
          const results = await geoRes.json();
          if (Array.isArray(results) && results.length > 0) {
            const first = results[0];
            return NextResponse.json({
              success: true,
              latitude: parseFloat(parseFloat(first.lat).toFixed(6)),
              longitude: parseFloat(parseFloat(first.lon).toFixed(6)),
              displayName: first.display_name,
              source: 'nominatim_search',
              allResults: results.map((r: any) => ({
                name: r.name || r.display_name.split(',')[0],
                displayName: r.display_name,
                latitude: parseFloat(parseFloat(r.lat).toFixed(6)),
                longitude: parseFloat(parseFloat(r.lon).toFixed(6)),
              })),
            });
          }
        }
      } catch (geoErr) {
        console.error('Geocoding search error:', geoErr);
      }
    }

    return NextResponse.json(
      {
        error: 'Tidak dapat menemukan koordinat dari input tersebut. Pastikan menyalin link Google Maps yang valid atau koordinat (contoh: -6.3685, 106.8920).',
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Parse gmaps error:', err);
    return NextResponse.json({ error: 'Gagal memproses koordinat Google Maps' }, { status: 500 });
  }
}

