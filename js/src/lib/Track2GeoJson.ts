import type { TrackSegment } from './TrackData';
import type { Feature, LineString } from "geojson";

class Track2GeoJson {

  trackSegment: TrackSegment;

  constructor(trackSegment: TrackSegment) {
    this.trackSegment = trackSegment
  }

  _toPointList() {
    const pointList = this.trackSegment.map((e) => [e.lon, e.lat, e.elevation])
    return pointList
  }

  toGeoJsonLineStringFeature(): Feature<LineString> {

    // Tracksegment format: [ { lat: x, lon: y, elevation: z }, ...]
    const coordinates = this.trackSegment.map((e) => [e.lon, e.lat, e.elevation])

    const lineS: LineString = {
      type: 'LineString',
      coordinates
    }

    const feature: Feature<LineString> = {
      "type": "Feature",
      "properties": {},
      "geometry": lineS
    }
    return feature
  }

}

export { Track2GeoJson }