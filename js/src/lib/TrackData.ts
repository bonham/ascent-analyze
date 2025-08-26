// Define a type for a geographic point
interface TrackPoint {
  lat: number;
  lon: number;
  elevation: number;
}

interface TrackPointWithDistance extends TrackPoint {
  distanceFromStart: number
}

type TrackSegmentWithDistance = TrackPointWithDistance[]

// Define type for a segment (an array of points)
type TrackSegment = TrackPoint[];

// Class definition
class TrackData {
  private segments: TrackSegment[] = [];

  // Add a new segment
  addSegment(points: TrackSegment = []): void {
    this.segments.push(points);
  }

  /**Add a point to a specific segment
   * @param segmentIndex - which segment in track.
   * @param lat - latitude.
   * @param lon - longitude
  */
  addPointToSegment(segmentIndex: number, lat: number, lon: number, elevation: number): void {
    if (!this.segments[segmentIndex]) {
      this.segments[segmentIndex] = [];
    }
    this.segments[segmentIndex].push({ lat, lon, elevation });
  }

  // Get all segments
  getSegments(): TrackSegment[] {
    return this.segments;
  }

  // Get points from a specific segment
  getSegment(segmentIndex: number): TrackSegment {
    return this.segments[segmentIndex] || [];
  }

  // Get all points across all segments
  getAllPoints(): TrackPoint[] {
    return this.segments.flat();
  }
}

/**
 * Class to provide slices with labels from original linestring
 * Tracks always start from distance=0
 */
class TrackSegmentIndexed {

  segment: TrackSegmentWithDistance
  pointDistance: number
  startIndex: number

  pointsByIndex: { [key: number]: TrackPoint } = {}
  arrayOfIndexedPoints: { index: number, point: TrackPointWithDistance }[] = []

  /**
   * Create TrackSegmentIndexed from TrackSegment
   * @param track Track with equidistant points. User needs to ensure consistency with pointDistance.
   * @param pointDistance Fixed distance of points. User needs to ensure constincency with track points.
   * @param [startIndex=0] Optionally start from index > 0
   */
  constructor(track: TrackSegmentWithDistance, pointDistance: number, startIndex = 0) {
    this.segment = track
    this.pointDistance = pointDistance
    this.startIndex = startIndex

    track.forEach((tpoint, i) => {
      const index = startIndex + i
      this.pointsByIndex[index] = tpoint
      this.arrayOfIndexedPoints.push({ index, point: tpoint })
    })
  }

  getSegment() {
    return this.segment
  }

  /**
   * Converts from virtual to internal index
   * @param index Virtual index
   * @returns Internal Index
   */
  toInternalIndex(index: number) {
    return index - this.startIndex
  }

  /**
   * Converts from internal to virtual index
   * @param index Internal index
   * @returns Virtual Index
   */
  toVirtualIndex(index: number) {
    return index + this.startIndex
  }

  sliceSegmentByInternalIndex(start: number, end: number) {
    return this.getSegment().slice(start, end)
  }

  sliceByInternalIndex(start: number, end: number) {
    const startVirtual = this.toVirtualIndex(start)
    return new TrackSegmentIndexed(this.sliceSegmentByInternalIndex(start, end), this.pointDistance, startVirtual)
  }

  length() {
    return this.arrayOfIndexedPoints.length
  }

  minIndex() {
    return this.arrayOfIndexedPoints[0].index
  }

  maxIndex() {
    const length = this.arrayOfIndexedPoints.length
    return this.arrayOfIndexedPoints[length - 1].index
  }

  get(index: number) {
    return this.pointsByIndex[index]
  }

  /**
   * Slice by index ( could be index not starting by zero )
   * @param start start
   * @param end end ( not included )
   * @returns sliced
   */
  sliceSegment(start: number, end: number) {

    const internalStart = this.toInternalIndex(start)
    const internalEnd = this.toInternalIndex(end)

    if (internalStart < 0 || internalStart > this.length() + 1) {
      throw new Error(`Start out of bounds. ${start} is not within ${this.startIndex} and ${this.startIndex + this.length()}`)
    }

    if (internalEnd < 0 || internalEnd > this.length()) {
      throw new Error(`Start out of bounds. ${end} is not within ${this.startIndex} and ${this.startIndex + this.length()}`)
    }

    return this.segment.slice(
      internalStart,
      internalEnd
    )
  }

  slice(start: number, end: number) {
    const slicedSegment = this.sliceSegment(start, end)
    return new TrackSegmentIndexed(slicedSegment, this.pointDistance, start)
  }

  indexList() {
    return this.arrayOfIndexedPoints.map(e => e.index)
  }

  /**
   * Zooms into the array and returns 
   * 
   * @param midpoint Midpoint in internal index coordinates
   * @param factor Zoom factor
   */
  zoom(midpointInternalIndex: number, factor: number) {

    const origIndexes = this.indexList()
    const numLeft = midpointInternalIndex
    const numRight = origIndexes.length - numLeft - 1

    const numLeftZoom = Math.round(numLeft * factor)
    const numRightZoom = Math.round(numRight * factor)

    const leftStartInternal = midpointInternalIndex - numLeftZoom
    const rightEndInternal = midpointInternalIndex + numRightZoom

    return this.sliceByInternalIndex(leftStartInternal, rightEndInternal + 1) // right slice is +1
  }
}

export { TrackData, TrackSegmentIndexed };
export type { TrackPoint, TrackSegment, TrackPointWithDistance, TrackSegmentWithDistance };
