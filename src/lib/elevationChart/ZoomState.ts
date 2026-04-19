import { stretchInterval } from '@/lib/app/transformHelpers';
const { ceil, floor, round } = Math

interface DataInterval {
  start: number,
  end: number
}

const MIN_STRETCH_INTERVAL_LENGTH = 5
const VERBOSE = false

/**
 * Manages the zoom state and logic for an elevation chart, handling user interactions such as mouse wheel zooming.
 * 
 * The `ZoomState` class tracks the progress of zoom operations, accumulates zoom deltas, and calculates new data intervals
 * based on user input. It ensures zooming is performed around a specific chart position, respects sensitivity settings,
 * and enforces interval boundaries and minimum lengths. The class provides methods to initiate and finish zooming,
 * retrieve the current zoom state, and access relevant positions and deltas.
 * 
 * ## Usage
 * 
 * 1. **Instantiate**: Create a new `ZoomState` with a sensitivity value and a base data interval.
 *    ```typescript
 *    const zoomState = new ZoomState(0.01, { start: 0, end: 100 });
 *    ```
 * 2. **Apply Zoom Transformations**: Call `zoomTransformation(delta, midPoint)` as the user interacts (e.g., mouse wheel events).
 * 3. **Start Zoom**: When ready to apply the accumulated zoom, call `startZoom()` to get the new interval.
 * 4. **Finish Zoom**: Call `zoomFinished()` to reset the zoom state after the operation.
 * 5. **Access State**: Use methods like `zoomInProgress()` to query the current zoom state.
 *
 * This class is designed to be used in interactive chart components where zooming behavior must be managed and constrained.
 */
class ZoomPanState {
  _zoomInProgress: boolean = false

  _zoomSensitivity: number
  _baseInterval: DataInterval
  _currentInterval: DataInterval

  _hasChanged = false // indicator if last changes have been processed

  constructor(sensitivity: number, baseInterval: DataInterval) {
    this._zoomSensitivity = sensitivity
    this._baseInterval = baseInterval
    this._currentInterval = baseInterval
  }

  /**
   * Applies a zoom transformation to the chart by updating the accumulated zoom delta and the last x-axis position.
   *
   * @param delta - The amount to adjust the zoom level by.
   * @param midPoint - The x-axis position around which the zoom is centered.
   */
  zoomTransformation(delta: number, midPoint: number) {
    if (VERBOSE) console.log("Transform", delta)
    const zoomFactor = Math.exp(delta * this._zoomSensitivity)
    const stretchedFloat = stretchInterval(
      this._currentInterval.start,
      this._currentInterval.end,
      midPoint,
      zoomFactor,
      this._baseInterval.start,
      this._baseInterval.end,
      MIN_STRETCH_INTERVAL_LENGTH
    )
    this._currentInterval = stretchedFloat
    this._hasChanged = true

  }

  panTransformation(shiftX: number) {
    const I_min = this._baseInterval.start
    const I_max = this._baseInterval.end
    const current_start = this._currentInterval.start
    const current_end = this._currentInterval.end
    let newStart = current_start + shiftX
    let newEnd = current_end + shiftX

    // check boundaries
    if (newStart < I_min) {
      newStart = I_min
      newEnd = newStart + (current_end - current_start)
    }
    if (newEnd > I_max) {
      newEnd = I_max
      newStart = newEnd - (current_end - current_start)
    }
    this._currentInterval = { start: newStart, end: newEnd }
    this._hasChanged = true
  }

  setIntervalTransformation(newInterval: DataInterval) {
    const B_min = this._baseInterval.start
    const B_max = this._baseInterval.end

    let newStart = round(newInterval.start)
    let newEnd = round(newInterval.end)
    const newLength = newEnd - newStart

    // check boundaries
    if (newStart < B_min) {
      newStart = B_min
      newEnd = newStart + newLength
    }
    if (newEnd > B_max) {
      newEnd = B_max
      newStart = newEnd - newLength
    }

    this._currentInterval = {
      start: newStart,
      end: newEnd
    }
    this._hasChanged = true
  }

  /**
   * Calculates and returns a transformed data interval by rounding the start and end
   * values of the current interval to the nearest integers. This method also updates
   * the internal `_currentInterval` to the rounded values.
   *
   * @returns {DataInterval} The transformed data interval with rounded start and end values.
   */
  getTransformedInterval(): DataInterval {

    const roundedStretched = {
      // floor and ceil needed to have always a change even when increments are smaller than 1, in order to not get stuck on high zoom levels
      start: floor(this._currentInterval.start),
      end: ceil(this._currentInterval.end)
    }
    // a bit dirty: set internal interval also to rounded
    this._currentInterval = roundedStretched
    return roundedStretched
  }

  setHasChanged(b: boolean) {
    if (VERBOSE) console.log("HasChanged", b)
    this._hasChanged = b
  }

  setZoomInProgress(b: boolean) {
    if (VERBOSE) console.log("Zoominprogress", b)
    this._zoomInProgress = b
  }

  hasChanged() {
    return this._hasChanged
  }

  hasNotChanged() {
    return !this._hasChanged
  }

  transformInProgress(): boolean {
    return this._zoomInProgress
  }

  transformNotInProgress(): boolean {
    return !this._zoomInProgress
  }

  getCurrentInterval() {
    return this._currentInterval
  }

  setCurrentInterval(current: DataInterval) {
    this._currentInterval = current
    this._hasChanged = true
  }
}


export { ZoomPanState, type DataInterval }