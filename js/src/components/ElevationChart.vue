<template>
  <div class="chart-container px-1">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, watchEffect, computed } from 'vue';
import Chart from 'chart.js/auto';
import { TrackSegmentIndexed, type TrackSegmentWithDistance } from '@/lib/TrackData';
//import { createAscentFillPlugin } from '@/lib/AscentFillPlugin';
import { createVerticalLinePlugin } from '@/lib/elevationChart/VerticalLinePlugin';
// import type { VerticalLinePlugin } from '@/lib/elevationChart/VerticalLinePlugin';
import { ZoomState, type DataInterval } from '@/lib/elevationChart/ZoomState';

// parameters
const ZOOM_SENSITIVITY = 0.001

// 👇 Define props using defineProps
const props = defineProps<{
  fullSegment: TrackSegmentIndexed | null; // TrackSegment with equidistant points
  overlayIntervals: number[][]; // List of x axis index intervals to draw in different color ( virtual index )
  pointDistance: number;
  cursorIndex: number | null; // Vertical line cursor index value
}>();

const elevationData = computed(() => {
  const fseg = props.fullSegment
  if (fseg === null) { return null }
  else {
    const data = genData(fseg.getSegment())
    return data
  }
})

const baseInterval = computed((): DataInterval | null => {
  const edata = elevationData.value
  if (edata === null) return null
  else {
    const baseInterval = { start: 0, end: edata.length - 1 }
    return baseInterval
  }
})

interface ViewPortInterval {
  start: number,
  end: number
}

const emit = defineEmits<{
  (e: 'highlight-xvalue', index: number): void;
  (e: 'viewPort', interval: ViewPortInterval): void; // which part of x-axis is visible
}>();

/****** Refs *****/
const canvasRef = ref<HTMLCanvasElement | null>(null);// 👇 Canvas reference
const viewPortRef = ref<ViewPortInterval | null>(null)

/***   *****  */
let chartInstance: Chart<'line'> | null = null; // Chart instance holder



// Trigger chart update when trackSegmentInd or overlayIntervals change
/** 
 * Depends on reactive variables:
 * 
 * - props.overlayIntervals
 * - elevationData
 * - viewPortRef
 * 
 * Also needs these global vars
 * 
 * - chartInstance
 * 
 */
watchEffect(
  async () => {

    const overlayIntervals = props.overlayIntervals

    // set basic chart data
    if (elevationData.value === null) {
      console.log("Elevation data is null")
      return
    }

    if (viewPortRef.value === null) {// initial
      viewPortRef.value = { start: 0, end: elevationData.value.length - 1 }
    }

    if (chartInstance === null) {
      console.log("chartInstance is null, cannot update chart")
      return
    }


    chartInstance.data.datasets[0].data = elevationData.value
    chartInstance.data.labels = calcLabels(elevationData.value.length)

    // set overlay data
    const overlayLineData = genOverlayData(elevationData.value, overlayIntervals)
    chartInstance.data.datasets[1].data = overlayLineData

    // calc start and stop index from viewport
    if (chartInstance.options.scales !== undefined) {
      chartInstance.options.scales['x'] = getScaleX(viewPortRef.value.start, viewPortRef.value.end)
    }

    // update overlay intervals
    triggerChartUpdate(chartInstance)
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
 * Generate elevation data array for usage with chart
 * @param segment Track Segment
 */
function genData(segment: TrackSegmentWithDistance): number[] {
  const dataset = segment.map((_) => _.elevation)
  return dataset
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

/**
 * @param chartInstance 
 */
async function triggerChartUpdate(chartInstance: Chart<'line'>) {
  // await new Promise((resolve) => setTimeout(resolve, 150)) // need this, otherwise chart does not update properly on initial page load
  requestAnimationFrame(() =>
    chartInstance.update('none'))
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

// 🎨 Initialize chart once on mount
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
    type: 'line',

    data: {
      labels: [],
      datasets: [
        {
          //borderColor: '#4abfbf',
          borderColor: '#37a3eb',
          label: 'Elevation (m)',
          data: [],
          fill: false,
          order: 1,
          pointStyle: false
          //          hidden: true
        },
        {
          borderColor: '#dc3912',
          data: [],
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

  canvas.addEventListener('mousemove', (event) => {

    if (isDragging) {
      console.log("Dragging - ignoring mousemove")
      if (chartInstance === null || chartInstance === undefined) return

      const scaleXCurrent = clientXtoChartX(canvas, event.clientX)
      console.log("Scale X current", scaleXCurrent)
      if (scaleXCurrent === undefined) {
        console.log("Cannot get scaleXCurrent")
        return
      }
      if (scaleXStart === undefined) {
        console.log("pixelXStart is undefined")
        return
      }
      const deltaX = scaleXCurrent - scaleXStart
      console.log("Delta X", deltaX)
      // emit('pan', -deltaX) // negative, because moving mouse right means panning left

    } else {

      event.stopPropagation()
      const clientX = event.clientX
      emitXPosition(canvas, clientX)

    }
  })

  canvas.addEventListener('touchmove', (event) => {
    if (event.touches.length === 0) return;
    if (event.touches.length > 1) return; // only single touch
    const client = event.touches[0];
    emitXPosition(canvas, client.clientX)
  })

  canvas.addEventListener('touchstart', (event) => {
    if (event.touches.length === 0) return;
    if (event.touches.length > 1) return; // only single touch
    const client = event.touches[0];
    emitXPosition(canvas, client.clientX)
  })



  /********************    Zoom handling   ****************************************** */

  let oldWheelListener: ((event: WheelEvent) => void) | undefined

  watch(baseInterval, (newInterval) => {

    if (newInterval !== null) {

      if (oldWheelListener !== undefined) {
        canvas.removeEventListener('wheel', oldWheelListener)
      }

      const zoomState = new ZoomState(ZOOM_SENSITIVITY, newInterval)
      const newWheelListener = (event: WheelEvent) => wheelListener(event, zoomState)
      canvas.addEventListener('wheel', newWheelListener)
      oldWheelListener = newWheelListener
    }
  })

  /** 
   * Depends on
   * - canvas
   * - chartInstance
   */
  const wheelListener = (event: WheelEvent, zoomState: ZoomState) => {

    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const canvasPixelX = event.clientX - rect.left; // X mouse position relative to canvas

    // Convert pixel position to x-axis value using chart scales
    let xValue: number | undefined;
    if (chartInstance) {
      xValue = chartInstance.scales['x'].getValueForPixel(canvasPixelX);
      console.log("xValue", xValue)
    }
    if (xValue === undefined) {
      console.warn('Unable to get xValue from pixel position.');
      zoomState.zoomFinished()
      return;
    }

    event.preventDefault()

    // add the delta regardless if zoom is in progress or not.
    zoomState.zoomTransformation(event.deltaY, xValue)

    // Schedule a frame if not already zooming
    if (!zoomState.zoomInProgress()) {
      requestAnimationFrame(
        () => processZoom(zoomState)
      );
    } else {
      console.log("Zoom is in progress doing nothing")
    }

  }

  /**
   * Depends on param event
   * 
   * Depends on reactive vars
   * - viewPortRef
   * - baseInterval
   * 
   * Depends on globals
   * - zoomState
   * - chartInstance
   * - canvas
   * 
   * Uses functions
   * - stretchInterval
   * 
   * @param event 
   */
  function processZoom(zoomState: ZoomState) {

    if (zoomState.zoomInProgress()) {
      console.log("Zoom in progress")
      return
    };
    if (zoomState.accumulatedDelta() === 0) {
      console.log("Nothing accumulated")
      return
    };

    if (viewPortRef.value === null) {
      console.log("VP null"); return
    }

    // const xValue = zoomState.xPositionForZoom()
    // if (xValue === undefined) {
    //   console.error("X position could not be determined")
    //   zoomState.zoomFinished()
    //   return
    // }

    const stretched = zoomState.startZoom()

    /* -------------chart update --------------- */

    viewPortRef.value = {
      start: stretched.start,
      end: stretched.end
    }
    if (chartInstance !== null) { chartInstance.update('none') }
    else {
      console.warn("Chart instance null during zoom")
    }

    // work is done
    zoomState.zoomFinished(); // clear state
    /* ----------------------------------------*/

    // If more scroll happened during zoom, schedule another frame - can this happen?
    if (zoomState.accumulatedDelta() !== 0) {
      console.log("Catching up")
      requestAnimationFrame(() => processZoom(zoomState));
    }

  }

  /********************************************************************************** */

  function emitXPosition(canvas: HTMLCanvasElement, clientX: number) {

    // Get mouse position relative to canvas
    const xValueVirtual = clientXtoChartX(canvas, clientX)
    if (xValueVirtual !== undefined) {
      // console.log("Mouse move X", x, "Value virtual:", xValueVirtual);
      emit('highlight-xvalue', xValueVirtual);
    }
  }

  function clientXtoChartX(canvas: HTMLCanvasElement, clientX: number) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
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
  // watch(
  //   () => props.cursorIndex,
  //   (newIndex) => {
  //     //console.log("New index: ", newIndex)
  //     // does not work      if (chartInstance !== null) { chartInstance.clear(); chartInstance.render() } // to clear any existing line
  //     if (newIndex === null) return
  //     if (chartInstance &&
  //       chartInstance.data.labels &&
  //       chartInstance.data.labels.length > 0 &&
  //       chartInstance.config.plugins
  //     ) {
  //       // convert cursorIndex ( virtual ) to internal index:
  //       const newIndexVirtual = props.trackSegmentInd?.toInternalIndex(newIndex)
  //       if (newIndexVirtual === undefined) return
  //       const pixelX = chartInstance.scales['x'].getPixelForValue(newIndexVirtual); // e.g. 'March'
  //       //console.log("Pixel X", pixelX)
  //       //        const pluginInstance = Chart.registry.plugins.get('verticalLinePlugin');
  //       const pluginInstance = verticalLinePlugin;
  //       if (pluginInstance !== undefined
  //         && pluginInstance !== null
  //       ) {
  //         const vlp = pluginInstance as VerticalLinePlugin;
  //         vlp.mouseX = pixelX;
  //         chartInstance.update('none'); // to avoid animation
  //       }
  //     }
  //   }
  // )


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
