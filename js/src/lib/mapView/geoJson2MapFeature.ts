import GeoJSON from 'ol/format/GeoJSON';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString, MultiLineString as GeoJsonMultiLineString } from 'geojson'
import type { LineString as OlLineString, MultiLineString as OlMultiLineString } from 'ol/geom';
import OlFeature from 'ol/Feature';

export function geojsonLineString2OpenLayersLineString(feature: GeoJsonFeature<GeoJsonLineString>): OlFeature<OlLineString> {

  // incoming format: EPSG:3857 ( gpx )
  // incoming format: EPSG:3857 ( gpx )
  const mapFeature = new GeoJSON().readFeature(
    feature,
    {
      dataProjection: 'EPSG:4326', // lat lon
      featureProjection: 'EPSG:3857' // projection of map
    }
  )

  return mapFeature as OlFeature<OlLineString>

}

export function geojsonMultiLineString2OpenLayersMultiLineString(feature: GeoJsonFeature<GeoJsonMultiLineString>) {

  // incoming format: EPSG:3857 ( gpx )
  const mapFeature = new GeoJSON().readFeature(
    feature,
    {
      dataProjection: 'EPSG:4326', // lat lon
      featureProjection: 'EPSG:3857' // projection of map
    }
  )

  return mapFeature as OlFeature<OlMultiLineString>

}