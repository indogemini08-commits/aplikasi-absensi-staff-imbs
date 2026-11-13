export interface ParsedGeoResult {
  latitude: number;
  longitude: number;
  label?: string;
  source: 'google_maps_url' | 'raw_coordinates' | 'labeled_text' | 'nominatim_search';
}

/**
 * Extracts latitude and longitude from Google Maps URLs, coordinate strings, or labeled text.
 */
export function parseGoogleMapsCoordinates(input: string): ParsedGeoResult | null {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // 1. Google Maps @lat,lng format (most common desktop/mobile URL)
  // Example: https://www.google.com/maps/place/Something/@-6.368500,106.892000,17z/...
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { latitude: roundCoord(lat), longitude: roundCoord(lng), source: 'google_maps_url' };
    }
  }

  // 2. Query param ?q=lat,lng or ?ll=lat,lng or ?query=lat,lng or ?daddr=lat,lng
  // Example: https://maps.google.com/?q=-6.3685,106.8920
  const queryMatch = str.match(/[?&](?:q|query|ll|daddr|saddr)=(-?\d+\.\d+)[,+](-?\d+\.\d+)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { latitude: roundCoord(lat), longitude: roundCoord(lng), source: 'google_maps_url' };
    }
  }

  // 3. /place/.../lat,lng
  const placeMatch = str.match(/\/place\/[^/]+\/(-?\d+\.\d+)[,+](-?\d+\.\d+)/i);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { latitude: roundCoord(lat), longitude: roundCoord(lng), source: 'google_maps_url' };
    }
  }

  // 4. Labeled text: "Lat: -6.3685, Lng: 106.892" or "Latitude -6.3685, Longitude 106.892"
  const labeledMatch = str.match(/lat(?:itude)?[:\s=]+(-?\d+\.\d+)[,\s|]+long?(?:itude)?[:\s=]+(-?\d+\.\d+)/i);
  if (labeledMatch) {
    const lat = parseFloat(labeledMatch[1]);
    const lng = parseFloat(labeledMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { latitude: roundCoord(lat), longitude: roundCoord(lng), source: 'labeled_text' };
    }
  }

  // 5. Raw coordinate pair: "-6.368500, 106.892000" or "-6.3685 106.8920"
  const rawMatch = str.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { latitude: roundCoord(lat), longitude: roundCoord(lng), source: 'raw_coordinates' };
    }
  }

  // 6. Coordinates embedded anywhere in text
  const embeddedMatch = str.match(/(-?\d{1,2}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/);
  if (embeddedMatch) {
    const lat = parseFloat(embeddedMatch[1]);
    const lng = parseFloat(embeddedMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { latitude: roundCoord(lat), longitude: roundCoord(lng), source: 'raw_coordinates' };
    }
  }

  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function roundCoord(num: number): number {
  return parseFloat(num.toFixed(6));
}

