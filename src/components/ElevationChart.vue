<template>
  <div class="chart-container px-1">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, watchEffect, computed } from 'vue';
//import { createAscentFillPlugin } from '@/lib/AscentFillPlugin';
import { createVerticalLinePlugin } from '@/lib/elevationChart/VerticalLinePlugin';
import { ZoomPanState, type DataInterval } from '@/lib/elevationChart/ZoomState';
import { wheelEventHandler, panEventHandler, calcXPosition, touchEventHandler } from '@/lib/elevationChart/eventHandlers';
import { TransformPixelScale2ChartScale } from '@/lib/elevationChart/TransformPixelScale2ChartScale';
import type { TrackPoint, CursorSync } from '@/lib/elevationSync/types';

import { Chart } from 'chart.js/auto';

type TType = 'line';
type TLabel = string;
type TData = number[];

// parameters
const ZOOM_SENSITIVITY = 0.001

const props = defineProps<{
  points: TrackPoint[] | null;       // track points with distance + elevation; drives the chart
  overlayIntervals: number[][];      // index-based intervals to highlight in red (climb segments)
  cursor: CursorSync;                // shared cursor — receives hover position, drives vertical line
}>();

// Derived elevation array for the chart datasets
const elevationData = computed(() => props.points?.map(p => p.elevation) ?? null)

// Start and end index of the elevation data
const baseInterval = computed((): DataInterval | null => {
  const edata = elevationData.value
  if (edata === null) return null
  return { start: 0, end: edata.length - 1 }
})

/****** Refs *****/
const canvasRef = ref<HTMLCanvasElement | null>(null); // Canvas reference
const viewPortRef = ref<DataInterval | null>(null)     // zoom state / visible part of the chart

let chartInstance: Chart<TType, TData, TLabel> | null = null; // Chart instance holder


/**
 * Trigger chart update when points, overlayIntervals, or viewPortRef change.
 *
 * Reactive dependencies:
 * - elevationData  (derived from props.points)
 * - props.overlayIntervals
 * - viewPortRef
 *
 * Non-reactive dependency (module-level):
 * - chartInstance
 */
let initialUpdateRun = true
// watcher depends on:
// - elevationData ( => baseInterval )
// - overlayIntervals
// - viewPortRef
watchEffect(
  async () => {
    const overlayIntervals = props.overlayIntervals

    // set basic chart data
    if (elevationData.value === null) {
      console.log("Elevation data is null")
      return
    }

    if (viewPortRef.value === null) { // initial
      viewPortRef.value = { start: 0, end: elevationData.value.length - 1 }
    }

    if (chartInstance === null) {
      console.log("chartInstance is null, cannot update chart")
      return
    }

    if (chartInstance.data.datasets[0] === undefined || chartInstance.data.datasets[1] === undefined) {
      console.log("Chart has not sufficient datasets")
      return
    }

    chartInstance.data.datasets[0].data = elevationData.value
    chartInstance.data.labels = calcLabels()

    // set overlay data
    const overlayLineData = genOverlayData(elevationData.value, overlayIntervals)
    chartInstance.data.datasets[1].data = overlayLineData

    // calc X scale start and stop index from viewport
    if (chartInstance.options.scales !== undefined) {
      chartInstance.options.scales['x'] = getScaleX(viewPortRef.value.start, viewPortRef.value.end)
    }

    // calc Y scale min/max from visible data
    const maxY = Math.max(...elevationData.value)
    const minY = Math.min(...elevationData.value)
    if (chartInstance.options.scales !== undefined) {
      chartInstance.options.scales['y'] = getScaleY(minY, maxY)
    }

    // update chart — defer on first run to ensure canvas layout is complete
    if (initialUpdateRun) {
      requestAnimationFrame(() => chartInstance && chartInstance.update('none'))
      console.log("initial run")
      initialUpdateRun = false
    } else {
      chartInstance.update('none')
    }
  },
  {
    flush: 'post'  // to ensure DOM is updated (canvas available)
  }
);

/** Build x-axis labels from actual point distances (km). */
function calcLabels(): string[] {
  if (!props.points) return []
  return props.points.map(p => (p.distance / 1000).toFixed(1))
}

/**
 * Builds a gapped elevation array for the overlay dataset.
 * Only the index ranges listed in `intervals` are filled; the rest are NaN (no line drawn).
 * @param baseData  Full elevation array.
 * @param intervals Index-based [start, end] pairs to highlight.
 */
function genOverlayData(baseData: number[], intervals: number[][]): number[] {
  const sourceLength = baseData.length
  const resultArray: number[] = Array(sourceLength).fill(NaN)

  let maxEnd = 0

  for (const interval of intervals) {
    const [start, end] = interval
    if (start === undefined) {
      console.error(`Start is not defined`)
      return []
    }
    if (end === undefined) {
      console.error(`End is not defined`)
      return []
    }
    if (start >= sourceLength) {
      console.error(`Interval start value ${start} is out of bound of sourceSegment with length ${sourceLength}`)
      return []
    }
    if (end >= sourceLength) {
      console.error(`Interval end value ${end} is out of bound of sourceSegment with length ${sourceLength}`)
      return []
    }
    if (start >= end) {
      console.error(`Interval start value ${start} not smaller than end value ${end}`)
      return []
    }
    for (let i = start; i <= end; i++) {
      resultArray[i] = baseData[i]!
    }
    maxEnd = Math.max(maxEnd, end)
  }
  return resultArray.slice(0, maxEnd + 1)
}

// Plugin to draw vertical line at mouseX
const verticalLinePlugin = createVerticalLinePlugin()

// Plugin to fill area below chart (currently disabled — AscentFillPlugin planned separately)
//const ascentFillPlugin = createAscentFillPlugin(props.pointDistance)

function getScaleX(min: number | undefined, max: number | undefined) {
  const s = {
    title: {
      display: true,
      text: 'Distance (km)',
    },
    min: min ?? undefined,
    max: max ?? undefined
  }
  return s
}

// Calculate min/max of y scale:
// - 10% padding above and below the data range
// - rounded to the nearest 10m boundary
function getScaleY(dataMin: number | undefined, dataMax: number | undefined) {
  let minMaxOpts = {}
  if (dataMin !== undefined && dataMax !== undefined) {
    const range = dataMax - dataMin
    const padding = range * 0.1
    const minY = Math.floor((dataMin - padding) / 10) * 10
    const maxY = Math.ceil((dataMax + padding) / 10) * 10
    minMaxOpts = { min: minY, max: maxY }
  }
  const s = {
    title: {
      display: true,
      text: 'Elevation (m)'
    },
    ...minMaxOpts
  }
  return s
}

// Initialize chart once on mount
onMounted(() => {

  const scales = {
    x: getScaleX(undefined, undefined),
    y: getScaleY(undefined, undefined)
  }

  const canvas = canvasRef.value;

  if (!canvas) {
    console.warn('Canvas unavailable after mount.');
    return;
  }

  chartInstance = new Chart(canvas, {

    type: 'line' as TType,

    data: {
      labels: [],
      datasets: [
        {
          //borderColor: '#4abfbf',
          borderColor: '#37a3eb',
          label: 'Elevation (m)',
          data: [] as TData,
          fill: false,
          order: 1,
          pointStyle: false
          //          hidden: true
        },
        {
          borderColor: '#dc3912',
          data: [] as TData,
          fill: false,
          spanGaps: false,
          order: 0,
          pointStyle: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales,
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false }
      },
      elements: {
        point: {
          radius: 2,
          pointStyle: 'circle'
        },
        line: {
          tension: 0.2
        }
      },
      transitions: {
        scroll_update: {
          animation: {
            duration: 0
          }
        }
      }
    },
    // plugins: [verticalLinePlugin, ascentFillPlugin]
    plugins: [verticalLinePlugin]
  });


  // -------------------- event listeners

  // Add event listener for highlighting points
  // Reminder: touchmove does not work on iPhone — getting lags
  let isDragging = false
  let scaleXStart: number | undefined = undefined

  canvas.addEventListener('mousedown', (event) => {
    isDragging = true
    scaleXStart = clientXtoChartX(canvas, event.clientX)
  })

  canvas.addEventListener('mouseup', () => {
    isDragging = false
    scaleXStart = undefined
  })


  /********************    Zoom handling   ****************************************** */

  function updateChartFn(obj: DataInterval): void {
    if (viewPortRef.value !== undefined) {
      viewPortRef.value = obj
    }
  }

  let oldWheelHandler: ((event: WheelEvent) => void) | undefined
  let oldMouseMoveHandler: ((event: MouseEvent) => void) | undefined

  // Handle change of elevation data: re-register wheel/mousemove handlers with fresh zoom state
  watch(baseInterval, (newInterval) => {

    if (newInterval !== null) {

      if (oldWheelHandler !== undefined) {
        canvas.removeEventListener('wheel', oldWheelHandler)
      }
      if (oldMouseMoveHandler !== undefined) {
        canvas.removeEventListener('mousemove', oldMouseMoveHandler)
      }

      // reset zoom state to full range of new data
      if (elevationData.value) {
        viewPortRef.value = { start: 0, end: elevationData.value.length - 1 }
      }
      const zoomState = new ZoomPanState(ZOOM_SENSITIVITY, newInterval)

      /**
       * Handles mouse wheel events for zooming the chart.
       * - Calculates the x-axis position of the mouse.
       * - Calls wheelEventHandler to update the zoom state and chart viewport.
       * - Prevents default scrolling behavior.
       */
      const newWheelHandler = (event: WheelEvent) => {

        event.preventDefault()
        if (chartInstance === null) throw new Error("chart instance is null while running wheel handler")
        const xPosition = calcXPosition(event.clientX, chartInstance, canvas.getBoundingClientRect().left)
        if (xPosition === undefined) { console.log("xPosition undefined in wheel handler"); return }

        wheelEventHandler(event.deltaY, xPosition, zoomState, updateChartFn)

      }
      canvas.addEventListener('wheel', newWheelHandler)

      const newMouseMoveHandler = (event: MouseEvent) => {

        if (isDragging) {
          if (chartInstance === null || chartInstance === undefined) return

          const scaleXCurrent = clientXtoChartX(canvas, event.clientX)
          if (scaleXCurrent === undefined) {
            console.log("Cannot get scaleXCurrent")
            return
          }
          if (scaleXStart === undefined) {
            console.log("pixelXStart is undefined")
            return
          }
          const shiftX = scaleXCurrent - scaleXStart
          // negative deltaX because moving mouse right means panning left
          panEventHandler(-shiftX, zoomState, updateChartFn)

        } else {

          event.stopPropagation()
          notifyCursor(canvas, event.clientX)

        }
      }
      canvas.addEventListener('mousemove', newMouseMoveHandler)

      oldWheelHandler = newWheelHandler
      oldMouseMoveHandler = newMouseMoveHandler

      /****************** Touch ******************** */

      const tpc = new TransformPixelScale2ChartScale()

      canvas.addEventListener('touchstart', (event) => {

        event.preventDefault()

        if (event.touches.length === 1) {
          const client = event.touches[0]!;
          notifyCursor(canvas, client.clientX)

        } else if (event.touches.length === 2) {

          if (!chartInstance) return
          if (!chartInstance.data.labels) return

          tpc.setChartStartInterval(zoomState.getCurrentInterval())
          const x0 = 0
          const p0 = chartInstance.scales['x']!.getPixelForValue(x0)
          const x1 = chartInstance.options.scales!['x']!.max as number
          const p1 = chartInstance.scales['x']!.getPixelForValue(x1)

          tpc.setPoints(p0, x0, p1, x1)
          tpc.setPixelStartInterval({ start: event.touches[0]!.clientX, end: event.touches[1]!.clientX })

        } else {
          return
        }
      })

      canvas.addEventListener('touchend', () => {

      })

      canvas.addEventListener('touchmove', (event) => {

        if (event.touches.length === 1) {

          const client = event.touches[0]!;
          notifyCursor(canvas, client.clientX)

        } else if (event.touches.length === 2) {

          event.preventDefault()

          tpc.setPixelPinchedInterval({ start: event.touches[0]!.clientX, end: event.touches[1]!.clientX })
          const newInterval = tpc.getChartPinchedInterval()
          touchEventHandler(newInterval, zoomState, updateChartFn)
        } else {
          return
        }
      })
    }
  })

  /********************************************************************************** */

  /**
   * Convert a clientX pixel position to a chart x-axis index, then look up the
   * corresponding distance from props.points and push it into the shared cursor.
   * This replaces the old emit('highlight-xvalue') pattern.
   */
  function notifyCursor(canvas: HTMLCanvasElement, clientX: number) {
    const idx = clientXtoChartX(canvas, clientX)
    if (idx !== undefined && props.points) {
      const pt = props.points[Math.round(idx)]
      if (pt !== undefined) {
        // console.log("Chart hover — index:", Math.round(idx), "distance:", pt.distance)
        props.cursor.setByDistance(pt.distance)
      }
    }
  }

  /**
   * Converts a clientX pixel position (from mouse or touch event) to the
   * corresponding x-axis index value on the Chart.js chart.
   * @param canvas  The canvas element of the chart.
   * @param clientX The x-coordinate relative to the viewport.
   * @returns The x-axis index corresponding to the pixel position, or undefined if not available.
   */
  function clientXtoChartX(canvas: HTMLCanvasElement, clientX: number): number | undefined {
    const rect: DOMRect = canvas.getBoundingClientRect(); // size and position of canvas relative to viewport
    const x = clientX - rect.left; // x: pixel distance from left boundary of canvas
    let xValue: number | undefined;
    if (chartInstance) {
      xValue = chartInstance.scales['x']!.getValueForPixel(x);
    }
    if (xValue === undefined) {
      console.warn(`Unable to get xValue from pixel position ${x}`);
      return;
    }
    return xValue;
  }

  /**
   * Watch external cursor changes (e.g. map hover) and move the vertical line accordingly.
   * cursor.nearestIndex is the index into props.points closest to cursor.distance.
   */
  watch(
    () => props.cursor.nearestIndex.value,
    (newIndex) => {
      // console.log("External cursor index:", newIndex)
      if (newIndex === null) return
      if (chartInstance &&
        chartInstance.data.labels &&
        chartInstance.data.labels.length > 0 &&
        chartInstance.config.plugins
      ) {
        const pixelX = chartInstance.scales['x']!.getPixelForValue(newIndex);
        const pluginInstance = verticalLinePlugin;
        if (pluginInstance !== undefined && pluginInstance !== null) {
          verticalLinePlugin.mouseX = pixelX;
          chartInstance.update('none'); // 'none' to avoid animation
        }
      }
    }
  )

});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 250px;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
