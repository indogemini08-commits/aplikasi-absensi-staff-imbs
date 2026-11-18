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
  effectiveRadius: number;
  accuracyBuffer: number;
  formattedDistance: string;
}

const EARTH_RADIUS_METERS = 6371000; // Mean Earth radius in meters

/**
 * Calculates Haversine distance between two coordinates in meters.
 * High-precision formula using WGS-84 mean radius.
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
 * Takes into account hardware GNSS / GPS satellite accuracy uncertainty to prevent
 * false-negatives due to atmospheric or indoor satellite signal drift.
 * 
 * @param userCoord Coordinates of the user
 * @param locationCoord Coordinates of the work location
 * @param allowedRadiusMeters Configured radius in meters (e.g. 200m)
 * @param accuracyMeters Reported accuracy in meters from navigator.geolocation (e.g. 15m)
 */
export function checkGeofence(
  userCoord: Coordinates,
  locationCoord: Coordinates,
  allowedRadiusMeters: number,
  accuracyMeters?: number
): GeofenceResult {
  const distanceMeters = calculateHaversineDistance(userCoord, locationCoord);

  // Intelligent satellite accuracy tolerance:
  // If the user's phone reports an accuracy circle of ±X meters (95% confidence interval),
  // account for GPS satellite drift with an optimal confidence buffer (up to 25m or half accuracy).
  const accuracyBuffer =
    typeof accuracyMeters === 'number' && accuracyMeters > 0
      ? Math.min(25, Math.round(accuracyMeters * 0.5))
      : 0;

  const effectiveRadius = allowedRadiusMeters + accuracyBuffer;
  const isWithinRadius = distanceMeters <= effectiveRadius;

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
    effectiveRadius,
    accuracyBuffer,
    formattedDistance,
  };
}

/**
 * Formats coordinates for display (e.g. -6.208800, 106.845600).
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
