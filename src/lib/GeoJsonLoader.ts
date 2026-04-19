import { TrackData } from './TrackData';
import type { TrackPoint } from './TrackData';
import type { Feature, GeoJsonProperties, Geometry, GeoJSON } from "geojson";

function parseCoord(coord: number[]): TrackPoint {
  const lon = coord[0], lat = coord[1];
  if (lon === undefined || lat === undefined) throw new Error(`Invalid coordinate: ${JSON.stringify(coord)}`);
  return { lon, lat, elevation: coord[2] ?? 0 };
}

class GeoJsonLoader {
  // Parses GeoJSON and returns an array of TrackData
  static loadFromGeoJson(geoJson: GeoJSON): TrackData[] {
    const tracks: TrackData[] = [];

    // Check for FeatureCollection or single Feature
    const features: Feature<Geometry, GeoJsonProperties>[] = geoJson.type === 'FeatureCollection'
      ? geoJson.features as Feature<Geometry, GeoJsonProperties>[]
      : [geoJson as Feature<Geometry, GeoJsonProperties>];

    for (const feature of features) {
      const geometry = feature.geometry;
      const track = new TrackData();

      if (geometry.type === 'LineString') {
        const segment: TrackPoint[] = geometry.coordinates.map(parseCoord);
        track.addSegment(segment);
        tracks.push(track);
      }

      else if (geometry.type === 'MultiLineString') {
        for (const line of geometry.coordinates) {
          const segment: TrackPoint[] = line.map(parseCoord);
          track.addSegment(segment);
        }
        tracks.push(track);
      }

      // You can expand this to handle other geometry types if needed
    }

    return tracks;
  }
}

export { GeoJsonLoader };
