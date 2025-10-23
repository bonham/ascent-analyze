<template>
  <div class="chart-container px-1">
    <canvas ref="canvasRef"></canvas>
  </div>
  <div>{{ mylog }}</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, watchEffect, computed } from 'vue';
//import { createAscentFillPlugin } from '@/lib/AscentFillPlugin';
import { createVerticalLinePlugin } from '@/lib/elevationChart/VerticalLinePlugin';
// import type { VerticalLinePlugin } from '@/lib/elevationChart/VerticalLinePlugin';
import { ZoomPanState, type DataInterval } from '@/lib/elevationChart/ZoomState';
import { wheelEventHandler, panEventHandler, calcXPosition, touchEventHandler } from '@/lib/elevationChart/eventHandlers';
import { TransformPixelScale2ChartScale } from '@/lib/elevationChart/TransformPixelScale2ChartScale';

import { Chart } from 'chart.js/auto';

type TType = 'line';
type TLabel = string;
type TData = number[];

// parameters
const ZOOM_SENSITIVITY = 0.001

// 👇 Define props using defineProps
const props = defineProps<{
  elevationData: number[] | null;
  overlayIntervals: number[][]; // List of x axis index intervals to draw in different color ( virtual index )
  pointDistance: number;
  cursorIndex: number | null; // Vertical line cursor index value
}>();

const baseInterval = computed((): DataInterval | null => {
  const edata = props.elevationData
  if (edata === null) return null
  else {
    const bi = { start: 0, end: edata.length - 1 }
    return bi
  }
})

const emit = defineEmits<{
  (e: 'highlight-xvalue', index: number): void;
  (e: 'viewPort', interval: DataInterval): void; // which part of x-axis is visible
}>();

/****** Refs *****/
const canvasRef = ref<HTMLCanvasElement | null>(null);// 👇 Canvas reference
const viewPortRef = ref<DataInterval | null>(null)
const mylog = ref<string>("");

/***   *****  */
let chartInstance: Chart<TType, TData, TLabel> | null = null; // Chart instance holder

/** 
 * Trigger chart update when trackSegmentInd or overlayIntervals change
 * Depends on reactive variables:
 * - props.overlayIntervals
 * - elevationData
 * - viewPortRef
 * 
 * Also needs these global vars
 * - chartInstance
 */
let initialUpdateRun = true
watchEffect(
  async () => {
    const overlayIntervals = props.overlayIntervals

    // set basic chart data
    if (props.elevationData === null) {
      console.log("Elevation data is null")
      return
    }

    if (viewPortRef.value === null) {// initial
      viewPortRef.value = { start: 0, end: props.elevationData.length - 1 }
    }

    if (chartInstance === null) {
      console.log("chartInstance is null, cannot update chart")
      return
    }


    chartInstance.data.datasets[0].data = props.elevationData
    chartInstance.data.labels = calcLabels(props.elevationData.length)

    // set overlay data
    const overlayLineData = genOverlayData(props.elevationData, overlayIntervals)
    chartInstance.data.datasets[1].data = overlayLineData

    // calc start and stop index from viewport
    if (chartInstance.options.scales !== undefined) {
      chartInstance.options.scales['x'] = getScaleX(viewPortRef.value.start, viewPortRef.value.end)
    }

    // update overlay intervals
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

function calcLabels(length: number) {
  const myLabels = Array.from({ length }, (_, index) => (index * props.pointDistance / 1000).toFixed(1))
  return myLabels
}

/**
 * Calculates gapped data for 
 * @param baseData Elevation array
 * @param intervals Intervals of elevation data to show as overlay
 */
function genOverlayData(baseData: number[], intervals: number[][]): number[] {
  const sourceLength = baseData.length
  const resultArray: number[] = Array(sourceLength).fill(NaN)

  let maxEnd = 0

  for (const interval of intervals) {
    const [start, end] = interval
    if (start >= sourceLength) {
      throw new Error(`Interval start value ${start} is out of bound of sourceSegment with length ${length}`)
    }
    if (end >= sourceLength) {
      throw new Error(`Interval end value ${end} is out of bound of sourceSegment with length ${length}`)
    }
    if (start >= end) {
      throw new Error(`Interval start value ${start} not smaller than end value ${end}`)
    }
    for (let i = start; i <= end; i++) {
      resultArray[i] = baseData[i]
    }
    maxEnd = Math.max(maxEnd, end)
  }
  return resultArray.slice(0, maxEnd + 1)
}

// Plugin to draw vertical line at mouseX
const verticalLinePlugin = createVerticalLinePlugin()

// Plugin to fill area below chart
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

// Initialize chart once on mount
onMounted(() => {


  const scales = {
    x: getScaleX(undefined, undefined),
    y: {
      title: {
        display: true,
        text: 'Elevation (m)'
      }
    }
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
  // Reminder: touchmove does not work in iphone - getting lags
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

  watch(baseInterval, (newInterval) => {

    if (newInterval !== null) {

      if (oldWheelHandler !== undefined) {
        canvas.removeEventListener('wheel', oldWheelHandler)
      }
      if (oldMouseMoveHandler !== undefined) {
        canvas.removeEventListener('mousemove', oldMouseMoveHandler)
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
          const clientX = event.clientX
          emitXPosition(canvas, clientX)

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
          const client = event.touches[0];
          emitXPosition(canvas, client.clientX)

          mylog.value = "-- cleared --"

        } else if (event.touches.length === 2) {

          if (!chartInstance) return
          if (!chartInstance.data.labels) return

          tpc.setChartStartInterval(zoomState.getCurrentInterval())
          const x0 = 0
          const p0 = chartInstance.scales['x'].getPixelForValue(x0)
          const x1 = chartInstance.options.scales!['x']!.max as number
          const p1 = chartInstance.scales['x'].getPixelForValue(x1)

          tpc.setPoints(p0, x0, p1, x1)
          tpc.setPixelStartInterval({ start: event.touches[0].clientX, end: event.touches[1].clientX })

          mylog.value = `ts p0=${p0.toFixed(0)} x0=${x0.toFixed(0)} p1=${p1.toFixed(0)} x1=${x1.toFixed(0)}`
        } else {
          return
        }
      })

      canvas.addEventListener('touchend', () => {

      })

      canvas.addEventListener('touchmove', (event) => {

        if (event.touches.length === 1) {

          const client = event.touches[0];
          emitXPosition(canvas, client.clientX)

        } else if (event.touches.length === 2) {

          event.preventDefault()

          tpc.setPixelPinchedInterval({ start: event.touches[0].clientX, end: event.touches[1].clientX })
          const newInterval = tpc.getChartPinchedInterval()
          touchEventHandler(newInterval, zoomState, updateChartFn)

          mylog.value = (`sf=${tpc.scaleFactor.toFixed(1)} ppd=${tpc.pixelPanDelta.toFixed(1)} cpd=${tpc.chartpanDelta.toFixed(1)} cpm=${tpc.chartPincedMid.toFixed(1)} ` +
            `zf=${tpc.zoomFactor.toFixed(1)} pinchedI=${tpc.pixelPinchedInterval[0].toFixed(0)},` +
            ` ${tpc.pixelPinchedInterval[1].toFixed(0)} chartPinchedI=${newInterval.start.toFixed(0)},${newInterval.end.toFixed(0)} ` +
            `_curI=${zoomState._currentInterval.start.toFixed(0)},${zoomState._currentInterval.end.toFixed(0)}`)
        } else {
          return
        }
      })
    }
  })

  /********************************************************************************** */

  function emitXPosition(canvas: HTMLCanvasElement, clientX: number) {

    // Get mouse position relative to canvas
    const xValueVirtual = clientXtoChartX(canvas, clientX)
    if (xValueVirtual !== undefined) {
      // console.log("Mouse move X", x, "Value virtual:", xValueVirtual);
      emit('highlight-xvalue', xValueVirtual);
    }
  }

  /**
   * Converts a clientX pixel position (from mouse or touch event) to the corresponding x-axis value on the Chart.js chart.
   * @param canvas The canvas element of the chart.
   * @param clientX The x-coordinate relative to the viewport.
   * @returns The x-axis value (category index) corresponding to the pixel position, or undefined if not available.
   */
  function clientXtoChartX(canvas: HTMLCanvasElement, clientX: number) {
    const rect: DOMRect = canvas.getBoundingClientRect(); //  returns a object w information about the size canvas and its position relative to the viewport.
    const x = clientX - rect.left; // x: pixel distance from left boundary of canvas
    let xValue: number | undefined;
    if (chartInstance) {
      xValue = chartInstance.scales['x'].getValueForPixel(x);
    }
    if (xValue === undefined) {
      console.warn(`Unable to get xValue from pixel position ${x}`);
      return;
    }
    return xValue;
  }

  /**
   * watch vertical cursor external change 
   */
  watch(
    () => props.cursorIndex,
    (newIndex) => {
      //console.log("New index: ", newIndex)
      // does not work      if (chartInstance !== null) { chartInstance.clear(); chartInstance.render() } // to clear any existing line
      if (newIndex === null) return
      if (chartInstance &&
        chartInstance.data.labels &&
        chartInstance.data.labels.length > 0 &&
        chartInstance.config.plugins
      ) {
        const pixelX = chartInstance.scales['x'].getPixelForValue(newIndex); // e.g. 'March'
        const pluginInstance = verticalLinePlugin;
        if (pluginInstance !== undefined
          && pluginInstance !== null
        ) {

          verticalLinePlugin.mouseX = pixelX;
          chartInstance.update('none'); // to avoid animation
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
