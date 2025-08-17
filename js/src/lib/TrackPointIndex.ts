import KDBush from 'kdbush';
import { around } from 'geokdbush';

const MAXDISTANCE = Infinity

interface Point {
  lon: number;
  lat: number;
}

export class TrackPointIndex {
  index: KDBush;
  coordinates: Point[];

  constructor(segment: Point[]) {

    this.coordinates = segment
    this.index = new KDBush(segment.length)

    segment.forEach(tp => this.index.add(tp.lon, tp.lat))

  }

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

    if (nearest.length === 0) return null

    return Number(nearest[0])

  }

  getNearestPoint(lookupPoint: Point): Point | null {
    const nidx = this.getNearestIndex(lookupPoint)
    if (nidx === null) return null
    return this.coordinates[nidx]
  }
}

