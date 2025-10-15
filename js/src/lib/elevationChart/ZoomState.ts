import { stretchInterval } from '@/lib/app/transformHelpers';
const { ceil, floor } = Math

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
 * 5. **Access State**: Use methods like `zoomInProgress()`, `accumulatedDelta()`, `lastxPosition()`, and `xPositionForZoom()` to query the current zoom state.
 *
 * This class is designed to be used in interactive chart components where zooming behavior must be managed and constrained.
 */
class ZoomState {
  _zoomInProgress: boolean = false

  _lastxPosition: number | undefined = undefined
  _xPositionForZoom: number | undefined

  _sensitivity: number
  _baseInterval: DataInterval
  _currentInterval: DataInterval

  _hasChanged = false // indicator if last changes have been processed

  constructor(sensitivity: number, baseInterval: DataInterval) {
    this._sensitivity = sensitivity
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
    const zoomFactor = Math.exp(delta * this._sensitivity)
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

  /**
   * Initiates the zoom progress on the elevation chart based on the current mouse position and accumulated zoom delta.
   *
   * This method calculates a new zoom factor using the accumulated delta and sensitivity, then stretches the current data interval
   * around the mouse position to reflect the zoom. It ensures the zoom does not exceed the minimum allowed interval length and
   * limits the boundaries to the base interval. If the mouse position is undefined, it logs a warning and returns the current interval.
   *
   * @param getXValueForPixel - A function that maps a canvas X pixel position to a chart X value.
   * @returns The new stretched data interval after applying the zoom, or the current interval if the mouse position is undefined.
   */
  getTransformedInterval(): DataInterval {

    this._zoomInProgress = true

    const roundedStretched = {
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

  zoomInProgress(): boolean {
    return this._zoomInProgress
  }

  zoomNotInProgress(): boolean {
    return !this._zoomInProgress
  }

  lastxPosition() {
    return this._lastxPosition
  }

  xPositionForZoom() {
    return this._xPositionForZoom
  }

}


export { ZoomState, type DataInterval }