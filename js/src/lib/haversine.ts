
import type { TrackPoint } from './TrackData';
/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 *
 * @param point1 - The first TrackPoint.
 * @param point2 - The second TrackPoint.
 * @returns The distance between the two coordinates in meters.
 */
function haversineDistance(point1: TrackPoint, point2: TrackPoint): number {
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
export { haversineDistance };
