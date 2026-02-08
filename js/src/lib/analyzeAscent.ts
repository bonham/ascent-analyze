
import type { TrackSegment } from '@/lib/TrackData'

const START_TRIGGER_DELTA = 25
const STOP_TRIGGER_DELTA = 5
const WINDOW_SIZE = 5

/**
 * Analyzes elevation data in a track segment to detect and locate ascents.
 * The function identifies consecutive slope sections by comparing elevation changes
 * within a sliding window. It returns the start and stop indices of each detected ascent,
 * where the start is marked by the minimum elevation point and the stop by the maximum
 * elevation point within the window when the slope triggers are exceeded.
 *
 * @param seg - The track segment containing elevation data to analyze
 * @param startTrigger - Elevation gain threshold in meters within the window to trigger ascent detection 
 * @param stopTrigger - Elevation gain threshold in meters within the window to trigger ascent termination 
 * @param windowSize - Size of the sliding window in number of track points 
 * @returns An array of [startIndex, stopIndex] tuples representing the intervals of detected ascents
 */
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

  // Sliding window loop
  for (let idx = windowSize - 1; idx < seg.length; idx++) {

    if (windowSize < 2) return [] // no analysis possible)
    const windowStartIdx = idx - windowSize + 1

    const windowStartPoint = seg[windowStartIdx]! // loop bounds guarantee it
    const windowEndPoint = seg[idx]! // loop bounds guarantee it
    const elevationDelta = windowEndPoint.elevation - windowStartPoint.elevation

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
      if (windowEndPoint.elevation < maxElevationInterval) {
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