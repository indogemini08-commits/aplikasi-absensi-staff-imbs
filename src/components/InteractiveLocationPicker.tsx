'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface InteractiveLocationPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName: string;
  onChange: (coord: { latitude: number; longitude: number }) => void;
}

export default function InteractiveLocationPicker({
  latitude,
  longitude,
  radiusMeters,
  locationName,
  onChange,
}: InteractiveLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([latitude, longitude], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Klik peta untuk pilih titik koordinat',
        maxZoom: 19,
      }).addTo(map);

      // Handle click on map to move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(6));
        const newLng = parseFloat(e.latlng.lng.toFixed(6));
        onChangeRef.current({ latitude: newLat, longitude: newLng });
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Create custom pin icon
    const icon = L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="background-color: #1d4ed8; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold; cursor: grab;">
          📍
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // Update or create marker
    if (!markerRef.current) {
      const marker = L.marker([latitude, longitude], { icon, draggable: true }).addTo(map);
      marker.bindPopup(`<b>${locationName || 'Titik Absensi'}</b><br>Geser pin atau klik peta untuk ubah`).openPopup();

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeRef.current({
          latitude: parseFloat(pos.lat.toFixed(6)),
          longitude: parseFloat(pos.lng.toFixed(6)),
        });
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([latitude, longitude]);
      markerRef.current.setPopupContent(`<b>${locationName || 'Titik Absensi'}</b><br>Geser pin atau klik peta untuk ubah`);
    }

    // Update or create geofence radius circle
    if (!circleRef.current) {
      const circle = L.circle([latitude, longitude], {
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.18,
        radius: radiusMeters,
      }).addTo(map);
      circleRef.current = circle;
    } else {
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setRadius(radiusMeters);
    }

    map.panTo([latitude, longitude]);
  }, [latitude, longitude, radiusMeters, locationName]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 z-0" />
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between z-[400] shadow-sm pointer-events-none">
        <span>💡 <strong>Klik peta</strong> atau <strong>geser pin</strong> untuk mengubah titik koordinat</span>
        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </div>
    </div>
  );
}

