import { TrackSegmentIndexed } from './TrackData'
import throttle from 'lodash/throttle'

/**
 * Starting from initial full  segment this class applies zoom factors to existing state.
 */
class ZoomManager {
  fullSegment: TrackSegmentIndexed
  currentZoomFactor: number = 1
  currentSegment: TrackSegmentIndexed

  constructor(fullSegment: TrackSegmentIndexed) {
    this.fullSegment = fullSegment
    this.currentSegment = fullSegment
  }

  currentFactor() {
    return this.currentZoomFactor
  }

  applyFactor(centerIndex: number, factor: number) {
    const newFactor = this.currentZoomFactor * factor
    // factor can be maximum 1
    this.currentZoomFactor = Math.min(newFactor, 1)
    const newSegment = this.currentSegment.zoom(centerIndex, factor)
    this.currentSegment = newSegment
    return newSegment
  }
  /**
   * Returns initial segment
   */
  reset() {
    this.currentSegment = this.fullSegment
    this.currentZoomFactor = 1
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
 * @param I_max Max value in base interval
 * @param k Min boundary of start interval
 * @param l Max boundary of start interval (included)
 * @param m Mid value for stretching
 * @param f Stretch factor
 * @returns Object { start: v1, end: v2 } Boundaries of stretched interval
 */
function stretchInterval(I_max: number, k: number, l: number, m: number, f: number) {
  // Ursprüngliche Länge
  const originalLength = l - k + 1;

  // Neue gestreckte Länge
  const newLength = Math.round(originalLength * f);

  // Berechne neue Grenzen um den Mittelpunkt m
  const halfLength = Math.floor(newLength / 2);
  let new_k = m - halfLength;
  let new_l = m + (newLength - halfLength - 1);

  // Begrenzung auf das Intervall I = [0, I_max]
  new_k = Math.max(0, new_k);
  new_l = Math.min(I_max, new_l);

  return { start: new_k, end: new_l };
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

