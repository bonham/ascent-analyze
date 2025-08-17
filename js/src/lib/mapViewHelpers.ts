
import VectorSource from 'ol/source/Vector';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString } from 'geojson'
import Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import Point from 'ol/geom/Point';

class MarkerOnTrack {

  markerSource: VectorSource<Feature<Geometry>>;
  trackLineString: GeoJsonFeature<GeoJsonLineString> | null = null

  constructor(
    vSource: VectorSource<Feature<Geometry>>,
  ) {
    this.markerSource = vSource
  }

  setLineString(lineString: GeoJsonFeature<GeoJsonLineString>) {
    this.trackLineString = lineString
  }

  clear() {
    this.markerSource.clear()
  }

  setByIndex(newXposIndex: number) {

    // Obtain track coordinates
    if (this.trackLineString === null) {
      console.warn("Linestring not yet set")
      return
    }

    const trackPoints = this.trackLineString.geometry.coordinates

    const coord = trackPoints[newXposIndex]; // [lon, lat, elev]
    if (coord === undefined) { // index out of bounds
      console.warn(`Index ${newXposIndex} out of bound for track`)
      return
    }

    // clear old marker
    this.markerSource.clear(); // Remove old marker

    // prepare feature for ol layer
    const projected = fromLonLat([coord[0], coord[1]]);
    const marker = new Feature({
      geometry: new Point(projected)
    });

    this.markerSource.addFeature(marker); // Add new marker
  }

}

export { MarkerOnTrack }