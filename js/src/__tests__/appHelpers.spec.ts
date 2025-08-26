import { describe, test, expect } from 'vitest'
import { stretchInterval, roundToNextOdd, ZoomManager } from '@/lib/appHelpers';
import type { TrackSegmentWithDistance } from '@/lib/TrackData';
import { TrackSegmentIndexed } from "@/lib/TrackData"


describe("AppHelpers", () => {
  test("stretch_interval1", () => {
    const k = 40;
    const l = 50;
    const m = 45;
    const f = 1.3;
    const { start, end } = stretchInterval(k, l, m, f);
    const length = end - start + 1;
    expect(length).toBe(15);
    expect(start).toEqual(38);
    expect(end).toEqual(52);
  })

  test("stretch_interval 2", () => {
    const k = 0;
    const l = 9;
    const m = 5;
    const f = 1;
    const i_min = 0;
    const i_max = 9

    // length would be 10, but rounded to 11 - around 5 with min 0 and max 10. 
    // Then needs to be cut to be within min max - which cuts it down to 0,9 - length 10

    const { start, end } = stretchInterval(k, l, m, f, i_min, i_max);
    const length = end - start + 1;
    expect(length).toBe(10);
    expect(start).toEqual(0);
    expect(end).toEqual(9);
  })
})

describe("Round to next odd 2", () => {
  test.each([
    [4, 5],
    [5, 5],
    [4.9, 5],
    [3.9, 3],
    [4.1, 5],
    [5.9999, 5],
    [6, 7],
    [0.1, 1],
    [-0.1, -1],
    [-1, -1],
    [-1.9, -1],
    [-2.1, -3],
    [0, 1],
  ])("roundUpToNextOdd(%s) should return %s", (input, expected) => {
    expect(roundToNextOdd(input)).toBe(expected);
  });
});

describe("Zoom Manager", () => {
  let track1: TrackSegmentWithDistance
  let tsi: TrackSegmentIndexed

  beforeEach(() => {
    track1 = [
      { lat: 1, lon: 1.2, elevation: 10, distanceFromStart: 0 },    // 0 index
      { lat: 2, lon: 2.2, elevation: 20, distanceFromStart: 100 },  // 1
      { lat: 3, lon: 3.2, elevation: 30, distanceFromStart: 200 },  // 2
      { lat: 4, lon: 4.2, elevation: 40, distanceFromStart: 300 },  // 3
      { lat: 5, lon: 5.2, elevation: 50, distanceFromStart: 400 },  // 4
      { lat: 6, lon: 6.2, elevation: 60, distanceFromStart: 500 },  // 5
      { lat: 7, lon: 7.2, elevation: 70, distanceFromStart: 600 },  // 6
      { lat: 8, lon: 8.2, elevation: 80, distanceFromStart: 700 },  // 7
      { lat: 9, lon: 9.2, elevation: 90, distanceFromStart: 800 },  // 8
      { lat: 10, lon: 2, elevation: 100, distanceFromStart: 900 }   // 9
    ]
    tsi = new TrackSegmentIndexed(track1, 100)
  })


  test("One", () => {
    const zm = new ZoomManager(tsi)
    const zoomedSegment = zm.applyFactor(3, 1)
    expect(zoomedSegment.length()).toEqual(9)
    expect(zoomedSegment.getSegment()).toEqual(tsi.sliceSegment(0, 9))
  })

  test("Other center", () => {
    const zm = new ZoomManager(tsi)
    const zoomedSegment = zm.applyFactor(5, 1)
    expect(zoomedSegment.length()).toEqual(10)
    expect(zoomedSegment.getSegment()).toEqual(track1)

  })

  test("Half", () => {
    const zm = new ZoomManager(tsi)
    const zoomedSegment = zm.applyFactor(3, 0.5) // index 3 is fourth element

    expect(zoomedSegment.getSegment()).toEqual([
      { lat: 2, lon: 2.2, elevation: 20, distanceFromStart: 100 },
      { lat: 3, lon: 3.2, elevation: 30, distanceFromStart: 200 },
      { lat: 4, lon: 4.2, elevation: 40, distanceFromStart: 300 },
      { lat: 5, lon: 5.2, elevation: 50, distanceFromStart: 400 },
      { lat: 6, lon: 6.2, elevation: 60, distanceFromStart: 500 },
    ])
  })
})
