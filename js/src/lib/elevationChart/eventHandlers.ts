import { ZoomPanState, type DataInterval } from "./ZoomState";
import Chart from 'chart.js/auto';

const VERBOSELOG = false

type UpdateCallBack = (obj: DataInterval) => void

/**
 * Handles mouse wheel events for zooming on the chart.
 * 
 * Adds the wheel delta and x position to the state, and schedules a zoom frame if one is not already in progress.
 * When the scheduled frame runs, it processes the accumulated zoom and updates the chart.
 * 
 * @param deltaY The vertical scroll amount from the wheel event.
 * @param xPosition The x-axis position where the wheel event occurred.
 * @param zoomPanState The current state object.
 * @param updateChartCallbackFn Callback to update the chart with the new data interval.
 */
function wheelEventHandler(deltaY: number, xPosition: number, zoomPanState: ZoomPanState, updateChartCallbackFn: UpdateCallBack) {
  if (VERBOSELOG) console.log("wheel delta", deltaY)
  // add the delta regardless if zoom is in progress or not.
  zoomPanState.zoomTransformation(deltaY, xPosition)

  processTransform(zoomPanState, updateChartCallbackFn)
}

/**
 * Handles mouse drag events for panning on the chart.
 *
 * Applies the horizontal shift (shiftX) to the state, and schedules a frame to process the pan transformation.
 * When the scheduled frame runs, it updates the chart with the new data interval.
 *
 * @param shiftX The horizontal shift amount from the pan event.
 * @param zoomPanState The current state object.
 * @param updateChartCallbackFn Callback to update the chart with the new data interval.
 */
function panEventHandler(shiftX: number, zoomPanState: ZoomPanState, updateChartCallbackFn: UpdateCallBack) {
  if (VERBOSELOG) console.log("Pan shiftX", shiftX)
  zoomPanState.panTransformation(shiftX)
  processTransform(zoomPanState, updateChartCallbackFn)
}


/**
 * Processes the accumulated zoom actions and updates the chart.
 *
 * Initiates the zoom operation using the current state, calls the update callback with the new data interval,
 * and clears the state. If additional scroll events occurred during processing, schedules another frame to catch up.
 *
 * @param zoomPanState The current state object.
 * @param updateChartCallbackFn Callback to update the chart with the new data interval.
 */
function processTransform(zoomPanState: ZoomPanState, updateChartCallbackFn: UpdateCallBack) {
  // Schedule a frame if not already updating
  if (zoomPanState.transformNotInProgress()) {

    // schedule for later
    requestAnimationFrame(
      () => {
        if (zoomPanState.transformInProgress()) {
          console.log("Zoom already in progress")
          return
        };

        if (zoomPanState.hasNotChanged()) {
          console.log("No zoom change to process. Returning")
        }

        const stretched = zoomPanState.getTransformedInterval()
        zoomPanState.setHasChanged(false)
        zoomPanState.setZoomInProgress(true)
        updateChartCallbackFn(stretched) // assuming this is 'synchronous' - in case it is async - then we need a 'then' to check for .hasChanged() again
        zoomPanState.setZoomInProgress(false)
      }
    );
  } else {
    console.log("Zoom is in progress doing nothing")
  }
}

/**
 * Calculates the x-axis value on the chart corresponding to the mouse position.
 *
 * Converts the mouse's clientX position to a pixel position relative to the chart's canvas,
 * then uses the chart's x-scale to determine the corresponding data value or index.
 *
 * @param clientX - The x position of the mouse event (relative to the viewport).
 * @param chartInstance - The Chart.js chart instance.
 * @param leftCanvasCoordinate - The left coordinate of the canvas (relative to the viewport).
 * @returns The x-axis value or index corresponding to the mouse position, or undefined if not available.
 */
function calcXPosition(clientX: number, chartInstance: Chart<'line', number[], string>, leftCanvasCoordinate: number): number | undefined {

  const canvasPixelX = clientX - leftCanvasCoordinate; // X mouse position relative to canvas

  // Convert pixel position to x-axis value using chart scales
  let xValue: number | undefined;
  if (chartInstance) {
    xValue = chartInstance.scales['x'].getValueForPixel(canvasPixelX);
  }
  return xValue
}


export { calcXPosition, wheelEventHandler, panEventHandler, type UpdateCallBack } 
