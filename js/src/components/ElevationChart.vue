<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUpdated, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { TrackSegmentIndexed, type TrackSegmentWithDistance } from '@/lib/TrackData';
//import { createAscentFillPlugin } from '@/lib/AscentFillPlugin';
import { createVerticalLinePlugin } from '@/lib/VerticalLinePlugin';
import type { VerticalLinePlugin } from '@/lib/VerticalLinePlugin';

// 👇 Define props using defineProps
const props = defineProps<{
  trackCoords: TrackSegmentIndexed | null; // TrackSegment with equidistant points
  overlayIntervals: number[][]; // List of x axis index intervals to draw in different color ( virtual index )
  pointDistance: number;
  cursorIndex: number | null; // Vertical line cursor index value
}>();

const emit = defineEmits<{
  (e: 'highlight-xvalue', index: number): void;
  (e: 'zoom', index: number, deltaY: number): void;
}>();

// 👇 Canvas reference
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 👇 Chart instance holder
let chartInstance: Chart<'line'> | null = null;


function genData(segment: TrackSegmentWithDistance): number[] {
  const dataset = segment.map((_) => _.elevation)
  return dataset
}

function genOverlayData(baseData: number[], intervals: number[][]) {
  const sourceLength = baseData.length
  const resultArray = Array(sourceLength).fill(NaN)

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

function updateChart(chartInstance: Chart<'line'>, segmentI: TrackSegmentIndexed) {

  const indexList = segmentI.indexList()
  const myLabels = indexList.map(e => (e * segmentI.pointDistance / 1000).toFixed(1))
  const segment = segmentI.getSegment()
  const primaryLineData = genData(segment)

  // translate intervals from virtual to internal index
  const overLayIntervalsInternal = intervalsToInternal(segmentI, props.overlayIntervals)

  const overlayLineData = genOverlayData(primaryLineData, overLayIntervalsInternal)

  chartInstance.data.labels = myLabels
  chartInstance.data.datasets[0].data = primaryLineData
  chartInstance.data.datasets[1].data = overlayLineData

  //type MyUpdateArgType = Parameters<typeof chartInstance.update>[0];
  chartInstance.update('none');
}

function intervalsToInternal(si: TrackSegmentIndexed, sourceIntervals: number[][]) {
  const len = si.length()
  //  console.log("Length", len)
  const outI: number[][] = []
  for (const intv of sourceIntervals) {
    const [virtStart, virtEnd] = intv
    const intStart = si.toInternalIndex(virtStart)
    const intEnd = si.toInternalIndex(virtEnd)

    //    console.log(`(${virtStart}, ${virtEnd}) -> (${intStart}, ${intEnd})`)

    if (virtStart >= virtEnd) { throw new Error(`Virtual interval start ${virtStart} is not smaller than virtual end ${virtEnd}`) }

    // interval needs to be at least partially within the current data
    if ((intEnd > 0) && (intStart < len - 1)) {
      const startCapped = Math.max(0, intStart)
      const endCapped = Math.min(len - 1, intEnd)
      outI.push([startCapped, endCapped])
    }
  }
  return outI
}

// 🧭 Log whenever trackCoords changes
watch(
  () => props.trackCoords,
  (newTrackSegmentI) => {
    //console.log('🟦 Track coordinates updated:', newTrackSegment);
    if (newTrackSegmentI === null) return
    const newTrackSegment = newTrackSegmentI.getSegment()
    // Optionally update chart if it already exists
    if (chartInstance === null) {
      console.warn("chartInstance is null")
    } else if (newTrackSegment.length === 0) {
      console.warn("TrackSegment has null length")
    } else {
      updateChart(chartInstance, newTrackSegmentI)
    }
  },
  { immediate: true }
);

watch(
  () => props.overlayIntervals, () => chartInstance !== null && props.trackCoords !== null && updateChart(chartInstance, props.trackCoords)
)

// Plugin to draw vertical line at mouseX
const verticalLinePlugin = createVerticalLinePlugin()
// Plugin to fill area below chart
//const ascentFillPlugin = createAscentFillPlugin(props.pointDistance)

onUpdated(() => {
  if (chartInstance !== null) {
    chartInstance.update('none')
  }
})

// 🎨 Initialize chart once on mount
onMounted(() => {
  const scales = {
    x: {
      title: {
        display: true,
        text: 'Distance (km)'
      }
    },
    y: {
      title: {
        display: true,
        text: 'Elevation (m)'
      }
    }
  }

  const canvas = canvasRef.value;

  if (!canvas) {
    console.warn('⛔ Canvas unavailable during mount.');
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
          borderColor: 'red',
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


  if (chartInstance === null || !chartInstance) {
    console.warn('⛔ Chart instance is not initialized. Cannot add event listener');
  } else {

    // draw chart
    chartInstance.update();

    // Add event listener for highlighting points
    // Reminder: touchmove does not work in iphone - getting lags
    canvas.addEventListener('mousemove', (event) => {
      event.stopPropagation()
      const clientX = event.clientX
      emitXPosition(canvas, clientX)
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

    canvas.addEventListener('wheel', (event) => {
      // Get mouse position relative to canvas
      event.stopPropagation()
      event.preventDefault()
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;

      // Convert pixel position to x-axis value using chart scales
      let xValue: number | undefined;
      if (chartInstance) {
        xValue = chartInstance.scales['x'].getValueForPixel(x);
      }
      if (xValue === undefined) {
        console.warn('⛔ Unable to get xValue from pixel position.');
        return;
      }
      emit('zoom', xValue, event.deltaY)

    })

  }

  function emitXPosition(canvas: HTMLCanvasElement, clientX: number) {

    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const xValueVirtual = eventX2VirtualX(x)
    if (xValueVirtual !== undefined) {
      // console.log("Mouse move X", x, "Value virtual:", xValueVirtual);
      emit('highlight-xvalue', xValueVirtual);
    }

  }

  function eventX2VirtualX(x: number) {
    let xValue: number | undefined;
    if (chartInstance) {
      xValue = chartInstance.scales['x'].getValueForPixel(x);
    }
    if (xValue === undefined) {
      console.warn('⛔ Unable to get xValue from pixel position.');
      return;
    }

    const xValueVirtual = props.trackCoords?.toVirtualIndex(xValue);
    return xValueVirtual;
  }

  // watch vertical cursor external change
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
        // convert cursorIndex ( virtual ) to internal index:
        const newIndexVirtual = props.trackCoords?.toInternalIndex(newIndex)
        if (newIndexVirtual === undefined) return
        const pixelX = chartInstance.scales['x'].getPixelForValue(newIndexVirtual); // e.g. 'March'
        //console.log("Pixel X", pixelX)
        //        const pluginInstance = Chart.registry.plugins.get('verticalLinePlugin');
        const pluginInstance = verticalLinePlugin;
        if (pluginInstance !== undefined
          && pluginInstance !== null
        ) {
          const vlp = pluginInstance as VerticalLinePlugin;
          vlp.mouseX = pixelX;
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
