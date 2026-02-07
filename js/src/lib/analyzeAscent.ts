import type { TrackSegment } from '@/lib/TrackData'

const START_TRIGGER_DELTA = 25
const STOP_TRIGGER_DELTA = 5
const WINDOW_SIZE = 5

export function analyzeAscent(
  seg: TrackSegment,
  startTrigger = START_TRIGGER_DELTA,
  stopTrigger = STOP_TRIGGER_DELTA,
  windowSize = WINDOW_SIZE,
) {
  // analyze subsequent points

  // hill start : 5% über 500 m: entspricht 25 m über 500m - 5m pro 100m 

  let hillStarted = false
  let hillStartIdx: null | number = null
  let hillStopIdx: null | number = null

  const intervals: [number, number][] = []

  for (let idx = windowSize - 1; idx < seg.length; idx++) {

    if (windowSize < 2) return [] // no analysis possible)
    const windowStartIdx = idx - windowSize + 1

    const lastPoint = seg[windowStartIdx]
    const thisPoint = seg[idx]
    const elevationDelta = thisPoint.elevation - lastPoint.elevation

    // hill has not started yet, check if it starts here
    if (!hillStarted) {
      if (elevationDelta >= startTrigger) {
        hillStarted = true

        // we need to search for the point with the lowest elevation in the window
        const pointsInInterval = seg.slice(windowStartIdx, idx + 1)
        const indexMinElevationOfSlice = pointsInInterval.reduce(
          (indexMin, currentPoint, currentIndex, pointsInInterv) => currentPoint.elevation < pointsInInterv[indexMin].elevation ? currentIndex : indexMin,
          0
        )
        // calculate back from slicing
        const indexMinElevation = indexMinElevationOfSlice + windowStartIdx
        hillStartIdx = indexMinElevation
      }
      // hill has started , check when it ends, and where
    } else if (elevationDelta <= stopTrigger) {

      // We need to distinguish if a peak was reached or if the ascent does continue but is getting less steep.

      // find index of point with highest elevation in window
      const pointsInInterval = seg.slice(windowStartIdx, idx + 1)
      const indexMaxElevationOfSlice = pointsInInterval.reduce(
        (indexMax, currentPoint, currentIndex, pointsInInterv) => currentPoint.elevation > pointsInInterv[indexMax].elevation ? currentIndex : indexMax,
        0
      )
      // calculate back from slicing
      const indexMaxElevation = indexMaxElevationOfSlice + windowStartIdx
      const maxElevationInterval = seg[indexMaxElevation].elevation

      // peak is reached - slope ends at peak
      if (thisPoint.elevation < maxElevationInterval) {
        hillStopIdx = indexMaxElevation
        // otherwise - solpe ends at point with max elevation
      } else {
        hillStopIdx = indexMaxElevation
      }

      hillStarted = false
      if (hillStartIdx === null) { throw new Error("Hill start is null") }
      intervals.push([hillStartIdx, hillStopIdx])
      // advance the window to then end of the found interval
      //const windowStartIdx = idx - windowSize + 1
      idx = hillStopIdx + windowSize - 2 // -2 because in next loop there will be an increment
      // reset finding values
      hillStartIdx = null
      hillStopIdx = null

    }
  }
  return intervals
}