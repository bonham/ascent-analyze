
import { Gpx2Track } from '@/lib/Gpx2Track';
import type { FeatureCollection, Feature, LineString, MultiLineString, GeoJsonProperties } from 'geojson';


// Will only extract first track 
export function gpx2GeoJson(input: string): FeatureCollection<LineString> {
  const g2t = new Gpx2Track(input)
  const featureList = g2t.getTrackFeatures()

  if (featureList.length === 0) throw new Error('Uploaded file does not contain any tracks');

  // Only consider first track
  const firstFeature = featureList[0]

  if (isLineStringFeature(firstFeature)) {

    return makeFeatureCollection([firstFeature])

  } else if (isMultiLineStringFeature(firstFeature)) {

    const flattenedFeature = flattenMultiLineString(firstFeature)
    return makeFeatureCollection([flattenedFeature])

  } else {
    throw new Error('Uploaded file does not contain a valid LineString or MultiLineString Feature');
  }
}

function makeFeatureCollection(features: Feature<LineString, GeoJsonProperties>[]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: features
  }
}

function isLineStringFeature(obj: unknown): obj is Feature<LineString> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    obj &&
    'type' in obj &&
    obj.type === 'Feature' &&
    'geometry' in obj &&
    typeof obj.geometry === 'object' &&
    obj.geometry !== null &&
    'type' in obj.geometry &&
    obj.geometry.type === 'LineString'
  );
}

function isMultiLineStringFeature(obj: unknown): obj is Feature<MultiLineString> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    obj &&
    'type' in obj &&
    obj.type === 'Feature' &&
    'geometry' in obj &&
    typeof obj.geometry === 'object' &&
    obj.geometry !== null &&
    'type' in obj.geometry &&
    obj.geometry.type === 'MultiLineString'
  );
}

/**
 * Converts a GeoJSON MultiLineString feature into a LineString feature
 * by joining all coordinate arrays into one continuous line.
 */
export function flattenMultiLineString(
  multiLineFeature: Feature<MultiLineString, GeoJsonProperties>
): Feature<LineString, GeoJsonProperties> {
  const { coordinates } = multiLineFeature.geometry;

  const joinedCoordinates = coordinates.flat();

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: joinedCoordinates,
    },
    properties: multiLineFeature.properties ?? {},
  };
}
