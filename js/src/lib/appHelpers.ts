import { TrackSegmentIndexed } from './TrackData'
import throttle from 'lodash/throttle'
const { round, max, min } = Math

/**
 * Starting from initial full  segment this class applies zoom factors to existing state.
 */
class ZoomManager {
  fullSegment: TrackSegmentIndexed
  //currentZoomFactor: number = 1
  currentSegment: TrackSegmentIndexed

  constructor(fullSegment: TrackSegmentIndexed) {
    this.fullSegment = fullSegment
    this.currentSegment = fullSegment
  }

  // currentFactor() {
  //   return this.currentZoomFactor
  // }

  /**
   * Returns zoomed indexed segment
   * 
   * @param virtualCenterIndex Center of zoom
   * @param factor Zoom factor ( 0 < factor <= 1 )
   * @returns Zoomed Indexed segment
   */
  applyFactor(virtualCenterIndex: number, factor: number) {
    // const newFactor = this.currentZoomFactor * factor // ??
    // factor can be maximum 1 ( should yield fullSegment )
    // this.currentZoomFactor = Math.min(newFactor, 1)

    // zoom logic
    const curSeg = this.currentSegment
    const fullSeg = this.fullSegment

    const I_min = fullSeg.minIndex()
    const I_max = fullSeg.maxIndex()
    const current_start = curSeg.minIndex()
    const current_end = curSeg.maxIndex()

    console.log("\n\n--- applyFactor ----")
    console.log(`Current virt boundaries: ${current_start}, ${current_end}`)
    const cp = curSeg.get(virtualCenterIndex)
    console.log(`cent vidx:${virtualCenterIndex}, iidx:${curSeg.toInternalIndex(virtualCenterIndex)}, ele:${cp.elevation}, dist:${cp.distanceFromStart}`)
    // console.log("Current Segment", curSeg)
    const currentPercent = (virtualCenterIndex - current_start) / (current_end - current_start)
    console.log("Current perc:", currentPercent)

    const { start: newStart, end: newEnd } = stretchInterval(current_start, current_end, virtualCenterIndex, factor, I_min, I_max)
    const zoomedPercent = (virtualCenterIndex - newStart) / (newEnd - newStart)
    console.log("Zoomed perc:", zoomedPercent)

    const zoomedIndexedSegment = fullSeg.slice(newStart, newEnd + 1) // from full segment

    console.log(`New boundaries: ${newStart}, ${newEnd}, ${zoomedIndexedSegment.minIndex()}, ${zoomedIndexedSegment.maxIndex()},`)

    zoomedIndexedSegment.arrayOfIndexedPoints.forEach(_ => {
      if (_.point.elevation > 400) {
        console.log(`Above 400 idx:${_.index} Dist:${_.point.distanceFromStart}`)
      }
    })

    this.currentSegment = zoomedIndexedSegment
    // console.log("Zoomed Segment:", zoomedIndexedSegment)
    return zoomedIndexedSegment
  }

  applyFactorInternal(internalCenterIndex: number, factor: number) {
    const virtualIdx = this.currentSegment.toVirtualIndex(internalCenterIndex)
    return this.applyFactor(virtualIdx, factor)
  }
  /**
   * Returns initial segment
   */
  reset() {
    this.currentSegment = this.fullSegment
    //  this.currentZoomFactor = 1
    return this.fullSegment
  }
}

type ZoomFunction = (centerIndex: number, factor: number) => void

/**
 * Serializing and throttling of zoom commands coming from mousewheel
 */
class ZoomEventQueue {
  zoomFunction: ZoomFunction

  accumulatedZoomFactor: number | null = null
  lastCenterIndex: number | null = null

  throttledHandleZoom: () => void

  /**
   * 
   * @param zoomFunction Function which takes internal index and zoom factor as arguments
   */
  constructor(zoomFunction: ZoomFunction) {
    this.zoomFunction = zoomFunction

    const handleZoomBatched = () => {
      if (this.accumulatedZoomFactor !== null && this.lastCenterIndex !== null) {
        this.zoomFunction(this.lastCenterIndex, this.accumulatedZoomFactor)
        this.accumulatedZoomFactor = null
        this.lastCenterIndex = null
      }
    }
    this.throttledHandleZoom = throttle(handleZoomBatched, 500, { leading: true, trailing: true })
  }
  /**
   * Queues a zoom command
   * @param centerIndex Internal index ( mouse position in elevation chart )
   * @param factor zoom factor
   */
  queue(centerIndex: number, factor: number) {
    if (this.accumulatedZoomFactor === null) {
      this.accumulatedZoomFactor = factor
    } else {
      this.accumulatedZoomFactor *= factor
    }
    this.lastCenterIndex = centerIndex
    this.throttledHandleZoom()
  }
}

/**
 * Will stretch an interval of consecutive integers with stretch factor > 0 and mid point m. Stretching could not go beyond base interval min .. max
 * 
 * Algorithm tries to keep mid point exactly by adjusting length of new array to nearest odd integer.
 * This means that stretch factor is not always achieved exactly.
 * 
 * @param i_start Min boundary of start interval
 * @param i_end Max boundary of start interval (included)
 * @param mid Mid value for stretching
 * @param factor Stretch factor
 * @param [I_min=0] Minimum value of start
 * @param [I_max=Infinity] Maximum value of end
 * @returns Object { start: v1, end: v2 } Boundaries of stretched interval
 */
function stretchInterval(i_start: number, i_end: number, mid: number, factor: number, I_min = 0, I_max = Infinity) {

  const new_start1 = mid - factor * (mid - i_start)
  const new_end1 = mid + factor * (i_end - mid)

  const new_start2 = round(new_start1)
  const new_end2 = round(new_end1)

  const new_start = max(new_start2, I_min)
  const new_end = min(new_end2, I_max)

  return { start: new_start, end: new_end };
}

/**
 * Function which rounds to next odd number
 *
 * Credits: https://stackoverflow.com/questions/20983241/round-to-nearest-odd-digit#20983242
 * 
 * @param x number
 * @returns next odd integer number
 */
function roundToNextOdd(x: number) {
  const r = round((x - 1) / 2) * 2 + 1
  return r
}

export { roundToNextOdd, ZoomManager, ZoomEventQueue, stretchInterval }

