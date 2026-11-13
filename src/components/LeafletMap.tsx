'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapProps {
  userCoord: { latitude: number; longitude: number };
  locationCoord: { latitude: number; longitude: number };
  locationName: string;
  radiusMeters: number;
  isWithinRadius: boolean;
}

export default function LeafletMap({
  userCoord,
  locationCoord,
  locationName,
  radiusMeters,
  isWithinRadius,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current).setView(
        [locationCoord.latitude, locationCoord.longitude],
        16
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers except tile layer
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    // Custom Icon helper using SVG HTML
    const createCustomIcon = (bgColor: string, text: string) => {
      return L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background-color: ${bgColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
            ${text}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    };

    // Location center pin
    const locIcon = createCustomIcon('#059669', '🏢');
    L.marker([locationCoord.latitude, locationCoord.longitude], { icon: locIcon })
      .addTo(map)
      .bindPopup(`<b>${locationName}</b><br>Radius: ${radiusMeters} meter`)
      .openPopup();

    // Radius circle
    L.circle([locationCoord.latitude, locationCoord.longitude], {
      color: isWithinRadius ? '#10b981' : '#f43f5e',
      fillColor: isWithinRadius ? '#10b981' : '#f43f5e',
      fillOpacity: 0.15,
      radius: radiusMeters,
    }).addTo(map);

    // User pin
    const userIcon = createCustomIcon(isWithinRadius ? '#4f46e5' : '#e11d48', '👤');
    L.marker([userCoord.latitude, userCoord.longitude], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<b>Posisi Anda Saat Ini</b>`);

    // Fit bounds
    const bounds = L.latLngBounds([
      [locationCoord.latitude, locationCoord.longitude],
      [userCoord.latitude, userCoord.longitude],
    ]);
    map.fitBounds(bounds, { padding: [35, 35] });

    return () => {
      // cleanup on unmount
    };
  }, [userCoord, locationCoord, locationName, radiusMeters, isWithinRadius]);

  return <div ref={mapContainerRef} className="w-full h-52 z-0" />;
}

