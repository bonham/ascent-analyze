
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import Point from 'ol/geom/Point';
import type { Coordinate } from 'ol/coordinate';

/**
 * Class to draw and clear a marker by index on a linestring 
 */
class MarkerOnTrack {

  markerSource: VectorSource<Feature<Geometry>>;
  coordinates: Coordinate[] | null = null

  constructor(
    vSource: VectorSource<Feature<Geometry>>,
  ) {
    this.markerSource = vSource
  }

  /**
   * Sets the array of points to set marker on
   * @param coordinates Array of [ x, y ]. Should be in same projection as map ( usually EPSG:3857)
   */
  setCoordinates(coordinates: Coordinate[]) {
    this.coordinates = coordinates
  }

  clear() {
    this.markerSource.clear()
  }

  setByIndex(newXposIndex: number) {

    // Obtain track coordinates
    if (this.coordinates === null) {
      console.warn("Coordinates not yet set")
      return
    }

    const coord = this.coordinates[newXposIndex]; // [x, y][]
    if (coord === undefined) { // index out of bounds
      // console.warn(`Index ${newXposIndex} out of bound for track`)
      return
    }

    // clear old marker
    this.markerSource.clear(); // Remove old marker

    // prepare feature for ol layer
    const marker = new Feature({
      geometry: new Point(coord)
    });

    this.markerSource.addFeature(marker); // Add new marker
  }

}

export { MarkerOnTrack }