import { ZoomState } from "@/lib/elevationChart/ZoomState";
import { beforeEach, describe, test, expect } from "vitest";

describe("ZoomState", () => {
  let zs: ZoomState
  beforeEach(() => {
    zs = new ZoomState(Math.log(2), { start: 0, end: 10 })
  })
  test("Initial state", () => {
    expect(zs.accumulatedDelta()).toEqual(0)
    expect(zs.zoomInProgress()).toBeFalsy()
    expect(zs.xPositionForZoom()).toBeUndefined()
  })

  test("Startstop", () => {
    // stopped
    zs.zoomTransformation(-2, 13)
    expect(zs.xPositionForZoom()).toBeUndefined()

    zs.zoomTransformation(-1, 5)

    // start zoom, this should return current delta and reset to 0
    const streched = zs.startZoom() // should reset delta
    expect(streched.start).toEqual(2)
    expect(streched.end).toEqual(8)
    expect(zs.accumulatedDelta()).toEqual(0)
    expect(zs.zoomInProgress()).toBeTruthy()
    expect(zs.xPositionForZoom()).toEqual(5) // last buffer transformation before start

    // continue adding delta while status is in progress
    zs.zoomTransformation(1, 15)
    expect(zs.xPositionForZoom()).toEqual(5) // last buffer transformation before start
    zs.zoomTransformation(5, 16)
    expect(zs.accumulatedDelta()).toEqual(6)

    // stop zoom and add more delta
    const r = zs.zoomFinished()
    expect(r).toBeUndefined()
    expect(zs.accumulatedDelta()).toEqual(6)

    // add more delta while zoom is stopped
    zs.zoomTransformation(-0.5, 17)
    expect(zs.accumulatedDelta()).toEqual(5.5)

  })

})