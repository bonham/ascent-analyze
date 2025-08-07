import { TrackData } from "@/lib/TrackData"

describe("Simple", () => {
  test("Simple", () => {

    const track = new TrackData();

    // Add a segment
    track.addSegment([
      { lat: 48.1374, lon: 11.5755, elevation: 520 },
      { lat: 48.1375, lon: 11.5756 }
    ]);

    // Add another point to segment 0
    track.addPointToSegment(0, 48.1376, 11.5757, 522);

    const segments = track.getSegments()
    expect(segments).toHaveLength(1)

  })
})