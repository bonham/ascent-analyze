import KDBush from 'kdbush';
import { around } from 'geokdbush';

const MAXDISTANCE = Infinity
const DEBUG = false
interface Point {
  lon: number;
  lat: number;
}

export class TrackPointIndex {
  index: KDBush;
  coordinates: Point[];
  debug: boolean = DEBUG

  /**
   * Create Instance
   * @param points List of lat lon coordinates in EPSG: 4326
   */
  constructor(points: Point[]) {

    this.coordinates = points
    this.index = new KDBush(points.length)

    points.forEach(tp => {
      const addIdx = this.index.add(tp.lon, tp.lat);
      if (this.debug) console.log("Add ", addIdx, tp.lon, tp.lat)
    })
    if (this.debug) console.log("Points in index: ", points)

    this.index.finish()

  }

  /**
   * Return Index of nearest point to points in index
   * @param lookupPoint Point with lat lon in EPSG: 4326
   * @returns index
   */
  getNearestIndex(lookupPoint: Point): number | null {
    const nearest = around(
      this.index,
      lookupPoint.lon,
      lookupPoint.lat,
      1, // num results to return
      MAXDISTANCE
    )



    if (!Array.isArray(nearest)) {
      console.warn("Geokdbush did not return array")
      return null
    }

    if (nearest.length === 0) {
      if (this.debug) console.log("Nearest array is zero")
      return null
    }

    if (this.debug) console.log("Lookup: ", lookupPoint, " Nearest", nearest[0], this.coordinates[nearest[0] as number])

    return Number(nearest[0])

  }

  /**
  * Return Index of nearest point to points in index
  * 
  * @param lookupPoint Point with lat lon in EPSG: 4326 
  * @returns Nearest point from index in EPSG: 4326
  */
  getNearestPoint(lookupPoint: Point): Point | null {
    const nidx = this.getNearestIndex(lookupPoint)
    if (nidx === null) return null
    return this.coordinates[nidx]
  }
}

