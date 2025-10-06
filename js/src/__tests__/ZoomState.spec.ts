import { ZoomState } from "@/lib/elevationChart/ZoomState";
import { beforeEach, describe, test, expect } from "vitest";

describe("ZoomState", () => {
  let zs: ZoomState
  beforeEach(() => {
    zs = new ZoomState(Math.log(2))
  })
  test("Initial state", () => {
    expect(zs.accumulatedDelta()).toEqual(0)
    expect(zs.zoomInProgress()).toBeFalsy()
    expect(zs.zoomFactor()).toEqual(1)
    expect(zs.mousePositionForZoom()).toBeUndefined()
  })

  test("Startstop", () => {
    // stopped
    zs.bufferTransformation(-2, 13)
    expect(zs.mousePositionForZoom()).toBeUndefined()
    expect(zs.zoomFactor()).toEqual(1)

    zs.bufferTransformation(-3, 14)

    // start zoom, this should return current delta and reset to 0
    const delta = zs.startZoomProgress() // should reset delta
    expect(delta).toEqual(-5)
    expect(zs.zoomFactor()).toEqual(1 / 32)
    expect(zs.accumulatedDelta()).toEqual(0)
    expect(zs.zoomInProgress()).toBeTruthy()
    expect(zs.mousePositionForZoom()).toEqual(14) // last buffer transformation before start

    // continue adding delta while status is in progress
    zs.bufferTransformation(1, 15)
    expect(zs.mousePositionForZoom()).toEqual(14) // last buffer transformation before start
    zs.bufferTransformation(5, 16)
    expect(zs.accumulatedDelta()).toEqual(6)

    // stop zoom and add more delta
    const r = zs.zoomFinished()
    expect(r).toBeUndefined()
    expect(zs.accumulatedDelta()).toEqual(6)

    // add more delta while zoom is stopped
    zs.bufferTransformation(-0.5, 17)
    expect(zs.accumulatedDelta()).toEqual(5.5)

  })

})