import { TrackSegmentIndexed } from './TrackData'
import throttle from 'lodash/throttle'

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
   * @param centerIndex Center of zoom
   * @param factor Zoom factor ( 0 < factor <= 1 )
   * @returns Zoomed Indexed segment
   */
  applyFactor(centerIndex: number, factor: number) {
    // const newFactor = this.currentZoomFactor * factor // ??
    // factor can be maximum 1 ( should yield fullSegment )
    // this.currentZoomFactor = Math.min(newFactor, 1)

    // zoom logic
    const I_min = this.fullSegment.minIndex()
    const I_max = this.fullSegment.maxIndex()
    const current_start = this.currentSegment.minIndex()
    const current_end = this.currentSegment.maxIndex()

    const { start: newStart, end: newEnd } = stretchInterval(current_start, current_end, centerIndex, factor, I_min, I_max)
    const zoomedIndexedSegment = this.fullSegment.slice(newStart, newEnd + 1)
    return zoomedIndexedSegment
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
 * Will stretch an interval of consecutive integers with stretch factor > 0 and mid point m. Stretching could not go beyond base interval 0 .. I_max
 * 
 * Algorithm tries to keep mid point exactly by adjusting length of new array to nearest odd integer.
 * This means that stretch factor is not always achieved exactly.
 * 
 * @param i_start Min boundary of start interval
 * @param i_end Max boundary of start interval (included)
 * @param mid Mid value for stretching
 * @param factor Stretch factor
 * @param [min=0] Minimum value of start
 * @param [max=Infinity] Maximum value of end
 * @returns Object { start: v1, end: v2 } Boundaries of stretched interval
 */
function stretchInterval(i_start: number, i_end: number, mid: number, factor: number, min = 0, max = Infinity) {
  // Ursprüngliche Länge
  const originalLength = i_end - i_start + 1;

  // Neue gestreckte Länge
  const newLength = roundToNextOdd(originalLength * factor);

  // Berechne neue Grenzen um den Mittelpunkt mid
  let new_start = mid + (1 - newLength) / 2;
  let new_end = mid + (newLength - 1) / 2;

  // Begrenzung auf das Intervall I = [0, I_max]
  new_start = Math.max(min, new_start);
  new_end = Math.min(max, new_end);

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
  const r = Math.round((x - 1) / 2) * 2 + 1
  return r
}

export { roundToNextOdd, ZoomManager, ZoomEventQueue, stretchInterval }

