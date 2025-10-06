/**
 * Maintain zoom state
 * - Accept new zoom deltas any time
 * - If zoom is already in progress then buffer the deltas
 * 
 */
export class ZoomState {
  _zoomInProgress: boolean = false
  _accumulatedDelta: number = 0

  _lastMousePosition: number | undefined = undefined
  _mousePositionForZoom: number | undefined

  _overallZoomFactor: number = 1
  _sensitivity: number

  constructor(sensitivity: number) {
    this._sensitivity = sensitivity
  }

  bufferTransformation(delta: number, midPoint: number) {
    this._accumulatedDelta += delta
    this._lastMousePosition = midPoint
  }

  startZoomProgress(): number {
    if (this._zoomInProgress === true) {
      console.warn("Progress was already set.")
    }

    this._zoomInProgress = true
    const accDelta = this.accumulatedDelta()
    this._accumulatedDelta = 0

    this._mousePositionForZoom = this._lastMousePosition

    const zoomFactor = Math.min(1, Math.exp(accDelta * this._sensitivity) * this._overallZoomFactor); // tweak sensitivity
    this._overallZoomFactor = zoomFactor

    return accDelta
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

  zoomFactor() {
    return this._overallZoomFactor
  }

  lastMousePosition() {
    return this._lastMousePosition
  }

  mousePositionForZoom() {
    return this._mousePositionForZoom
  }
}