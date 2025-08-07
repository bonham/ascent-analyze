import { createInterpolatorWithFallback } from "commons-math-interpolation";
import { haversineDistance } from './haversine';
import type { TrackSegment, TrackPoint } from './TrackData';

type TrackPointWithDistance = TrackPoint & { distanceFromStart: number };
type TrackSegmentWithDistance = TrackPointWithDistance[];

const InterpolationMethod = "akima";

function makeEquidistantTrackAkima(coords: TrackSegment, interval: number): TrackSegmentWithDistance {

  const distances = [0];
  let totalDist = 0;

  for (let i = 1; i < coords.length; i++) {
    totalDist += haversineDistance(coords[i - 1], coords[i]);
    distances.push(totalDist);
  }

  // Separate lat, lon, elev arrays
  const lats = coords.map(c => c.lat);
  const lons = coords.map(c => c.lon);
  const elevs = coords.map(c => c.elevation);

  // Create Akima interpolators

  const latInterp = createInterpolatorWithFallback(InterpolationMethod, distances, lats);
  const lonInterp = createInterpolatorWithFallback(InterpolationMethod, distances, lons);
  const elevInterp = createInterpolatorWithFallback(InterpolationMethod, distances, elevs);

  // Generate equidistant points
  const newCoords: TrackSegmentWithDistance = [];

  for (let d = 0; d <= totalDist; d += interval) {

    const lat = latInterp(d);
    const lon = lonInterp(d);
    const elevation = elevInterp(d);

    const tp: TrackPointWithDistance = {
      lat,
      lon,
      elevation,
      distanceFromStart: d
    };
    newCoords.push(tp);
  }

  return newCoords;
}

export { makeEquidistantTrackAkima };
export type { TrackPointWithDistance, TrackSegmentWithDistance }