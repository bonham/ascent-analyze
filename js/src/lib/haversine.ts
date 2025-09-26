
import type { TrackPoint } from './TrackData';
/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 *
 * @param point1 - The first TrackPoint.
 * @param point2 - The second TrackPoint.
 * @returns The distance between the two coordinates in meters.
 */
function haversineDistance(point1: { lat: number, lon: number }, point2: { lat: number, lon: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * Math.PI / 180;

  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lon - point1.lon);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the 3D distance between two geographic coordinates using the Haversine formula with elevation.
 *
 * @param point1 - The first TrackPoint.
 * @param point2 - The second TrackPoint.
 * @returns The 3D distance between the two coordinates in meters.
 */
function haversineDistanceWithElevation(point1: TrackPoint, point2: TrackPoint): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;

  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lon - point1.lon);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const surfaceDistance = R * c;

  const elevation1 = point1.elevation ?? 0;
  const elevation2 = point2.elevation ?? 0;
  const elevationDiff = elevation2 - elevation1;

  return Math.sqrt(surfaceDistance ** 2 + elevationDiff ** 2);
}

export { haversineDistance, haversineDistanceWithElevation };

