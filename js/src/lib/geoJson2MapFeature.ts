import GeoJSON from 'ol/format/GeoJSON';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString, MultiLineString as GeoJsonMultiLineString } from 'geojson'
import type { LineString as OlLineString, MultiLineString as OlMultiLineString } from 'ol/geom';
import OlFeature from 'ol/Feature';

export function geojsonFeature2mapFeature(feature: GeoJsonFeature<GeoJsonLineString | GeoJsonMultiLineString>) {

  // incoming format: EPSG:3857 ( gpx )
  const mapFeature = new GeoJSON().readFeature(
    feature,
    {
      dataProjection: 'EPSG:4326', // lat lon
      featureProjection: 'EPSG:3857' // projection of map
    }
  )

  if (feature.geometry.type === 'LineString') {
    return mapFeature as OlFeature<OlLineString>
  } else if (feature.geometry.type === 'MultiLineString') {
    return mapFeature as OlFeature<OlMultiLineString>
  } else {
    throw new Error("Feature is not of expected types LineString / MultiLineString")
  }
}