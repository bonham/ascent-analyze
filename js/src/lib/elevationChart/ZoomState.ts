import { stretchInterval } from '@/lib/app/transformHelpers';

interface DataInterval {
  start: number,
  end: number
}

const MIN_STRETCH_INTERVAL_LENGTH = 5


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
  _accumulatedDelta: number = 0

  _lastxPosition: number | undefined = undefined
  _xPositionForZoom: number | undefined

  _sensitivity: number
  _baseInterval: DataInterval
  _currentInterval: DataInterval

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
    this._accumulatedDelta += delta
    this._lastxPosition = midPoint
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
  startZoom(): DataInterval {
    if (this._zoomInProgress === true) {
      console.warn("Progress was already set.")
    }

    this._zoomInProgress = true
    const accDelta = this.accumulatedDelta()
    this._accumulatedDelta = 0

    this._xPositionForZoom = this._lastxPosition
    if (this._xPositionForZoom === undefined) {
      console.warn("X position undefined")
      return this._currentInterval
    }

    const zoomFactor = Math.exp(accDelta * this._sensitivity)

    const chartXPosition = this._xPositionForZoom
    const stretched = stretchInterval(
      this._currentInterval.start,
      this._currentInterval.end,
      chartXPosition,
      zoomFactor,
      this._baseInterval.start,
      this._baseInterval.end,
      MIN_STRETCH_INTERVAL_LENGTH
    )
    this._currentInterval = stretched
    return stretched
  }

  zoomFinished(): void {

    if (this._zoomInProgress === false) {
      console.warn("Zoom was already stopped")
    }
    this._zoomInProgress = false
  }

  accumulatedDelta(): number {
    return this._accumulatedDelta
  }

  zoomInProgress(): boolean {
    return this._zoomInProgress
  }

  lastxPosition() {
    return this._lastxPosition
  }

  xPositionForZoom() {
    return this._xPositionForZoom
  }
}


export { ZoomState, type DataInterval }