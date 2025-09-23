
import { Gpx2Track } from '@/lib/Gpx2Track';
import type { FeatureCollection, Feature, LineString } from 'geojson';


// Will only extract first track 
export function gpx2GeoJson(input: string): FeatureCollection<LineString> {
  const g2t = new Gpx2Track(input)
  const featureList = g2t.getTrackFeatures()

  const firstFeature = featureList[0]

  const geomType = firstFeature.geometry.type

  let lineStringFeature: Feature<LineString>

  if (geomType === 'MultiLineString') {

    lineStringFeature = {
      ...firstFeature,
      geometry: {
        ...firstFeature.geometry,
        type: 'LineString',
        coordinates: firstFeature.geometry.coordinates[0]
      }
    }
  } else if (geomType === 'LineString') {
    lineStringFeature = firstFeature as Feature<LineString>
  } else {
    throw new Error(`Invalid geojson feature type ${geomType}`)
  }

  // Example usage:
  if (!isLineStringFeature(lineStringFeature)) {
    throw new Error('Uploaded file does not contain a valid LineString Feature');
  }
  const featureCollection: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features: [
      lineStringFeature
    ]
  }
  return featureCollection
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