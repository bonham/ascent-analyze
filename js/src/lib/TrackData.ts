// Define a type for a geographic point
interface TrackPoint {
  lat: number;
  lon: number;
  elevation?: number; // Optional elevation
}

// Define type for a segment (an array of points)
type TrackSegment = TrackPoint[];

// Class definition
class TrackData {
  private segments: TrackSegment[] = [];

  // Add a new segment
  addSegment(points: TrackSegment = []): void {
    this.segments.push(points);
  }

  // Add a point to a specific segment
  addPointToSegment(segmentIndex: number, lat: number, lon: number, elevation?: number): void {
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

export default TrackData;
export type { TrackPoint, TrackSegment };
