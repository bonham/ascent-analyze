import { ZoomState, type DataInterval } from "./ZoomState";
import Chart from 'chart.js/auto';

type UpdateCallBack = (obj: DataInterval) => void

/**
 * Handles mouse wheel events for zooming on the chart.
 * 
 * Adds the wheel delta and x position to the zoom state, and schedules a zoom frame if one is not already in progress.
 * When the scheduled frame runs, it processes the accumulated zoom and updates the chart.
 * 
 * @param deltaY The vertical scroll amount from the wheel event.
 * @param xPosition The x-axis position where the wheel event occurred.
 * @param zoomState The current zoom state object.
 * @param updateChartCallbackFn Callback to update the chart with the new data interval.
 */
function wheelEventHandler(deltaY: number, xPosition: number, zoomState: ZoomState, updateChartCallbackFn: UpdateCallBack) {

  // add the delta regardless if zoom is in progress or not.
  zoomState.zoomTransformation(deltaY, xPosition)

  // Schedule a frame if not already zooming
  if (!zoomState.zoomInProgress()) {
    requestAnimationFrame(
      () => {
        if (zoomState.zoomInProgress()) {
          console.log("Zoom in progress")
          return
        };

        // in the meantime, another scheduled animation frame could have cleaned up the queue
        if (zoomState.accumulatedDelta() === 0) {
          return
        };
        processZoom(zoomState, updateChartCallbackFn)
      }
    );
  } else {
    console.log("Zoom is in progress doing nothing")
  }

}

/**
 * Processes the accumulated zoom actions and updates the chart.
 *
 * Initiates the zoom operation using the current zoom state, calls the update callback with the new data interval,
 * and clears the zoom state. If additional scroll events occurred during processing, schedules another frame to catch up.
 *
 * @param zoomState The current zoom state object.
 * @param updateChartCallbackFn Callback to update the chart with the new data interval.
 */
function processZoom(zoomState: ZoomState, updateChartCallbackFn: UpdateCallBack) {

  const stretched = zoomState.startZoom()
  updateChartCallbackFn(stretched)

  zoomState.zoomFinished(); // clear state

  // If more scroll happened during zoom, schedule another frame - can this happen?
  if (zoomState.accumulatedDelta() !== 0) {
    console.log("Catching up")
    requestAnimationFrame(() => processZoom(zoomState, updateChartCallbackFn));
  }
}

/**
 * 
 * @param clientX x position of mouse
 * @param chartInstance Chart instance
 * @param leftCanvasCoordinate Left coordinate of canvas
 * @returns index position of category X-scale of chart
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


export { calcXPosition, wheelEventHandler, type UpdateCallBack } 
