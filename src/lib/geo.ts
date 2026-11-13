/**
 * Geolocation and Haversine distance utilities.
 * Accurately calculates great-circle distance between two latitude/longitude points on Earth.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceResult {
  distanceMeters: number;
  isWithinRadius: boolean;
  allowedRadius: number;
  formattedDistance: string;
}

const EARTH_RADIUS_METERS = 6371000; // Mean Earth radius in meters

/**
 * Calculates Haversine distance between two coordinates in meters.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const deltaLat = toRad(coord2.latitude - coord1.latitude);
  const deltaLng = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;
  return Math.round(distance * 10) / 10; // 1 decimal point precision
}

/**
 * Verifies if user position is within the allowed radius of a work location.
 */
export function checkGeofence(
  userCoord: Coordinates,
  locationCoord: Coordinates,
  allowedRadiusMeters: number
): GeofenceResult {
  const distanceMeters = calculateHaversineDistance(userCoord, locationCoord);
  const isWithinRadius = distanceMeters <= allowedRadiusMeters;

  let formattedDistance = '';
  if (distanceMeters < 1000) {
    formattedDistance = `${Math.round(distanceMeters)} meter`;
  } else {
    formattedDistance = `${(distanceMeters / 1000).toFixed(2)} km`;
  }

  return {
    distanceMeters,
    isWithinRadius,
    allowedRadius: allowedRadiusMeters,
    formattedDistance,
  };
}

/**
 * Formats coordinates for display (e.g. -6.2088, 106.8456).
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

