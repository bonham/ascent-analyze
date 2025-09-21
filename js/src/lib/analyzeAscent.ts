import type { TrackSegment } from '@/lib/TrackData'

const START_TRIGGER_DELTA = 25
const STOP_TRIGGER_DELTA = 5

export function analyzeAscent(seg: TrackSegment, startTrigger = START_TRIGGER_DELTA, stopTrigger = STOP_TRIGGER_DELTA) {
  // analyze subsequent points

  // hill start : 5% über 500 m: entspricht 25 m über 500m - 5m pro 100m 

  const WINDOWSIZE = 5


  let hillStarted = false
  let hillStartIdx: null | number = null
  let hillStopIdx: null | number = null

  const intervals: [number, number][] = []

  for (let idx = WINDOWSIZE - 1; idx < seg.length; idx++) {

    const windowStartIdx = idx - WINDOWSIZE + 1

    const lastPoint = seg[windowStartIdx]
    const thisPoint = seg[idx]
    const elevationDelta = thisPoint.elevation - lastPoint.elevation

    if (!hillStarted) {
      if (elevationDelta >= startTrigger) {
        hillStarted = true
        hillStartIdx = windowStartIdx
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
        // otherwise - solpe ends at window start
      } else {
        hillStopIdx = windowStartIdx
      }

      hillStarted = false
      console.log("start stop: ", hillStartIdx, hillStopIdx)
      if (hillStartIdx === null) { throw new Error("Hill start is null") }
      intervals.push([hillStartIdx, hillStopIdx])
    }
  }
  return intervals
}