<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import type { TrackSegment } from './lib/TrackData';
import { createAreaProperties } from './lib/elevationChartHelpers'
import type { ElevationPoint } from './lib/elevationChartHelpers';

interface IndexedPoint {
  index: number,
  y: number
}

interface XYPoint {
  x: number,
  y: number
}


import type {
  Plugin,
} from 'chart.js';


// 👇 Define props using defineProps
const props = defineProps<{
  trackCoords: TrackSegment; // TrackSegment with equidistant points
  pointDistance: number;
}>();

const emit = defineEmits<{
  (e: 'highlight-xvalue', index: number): void;
}>();

// 👇 Canvas reference
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 👇 Chart instance holder
let chartInstance: Chart<'line'> | null = null;

function updateChart(chartInstance: Chart, segment: TrackSegment) {

  const numDataPoints = segment.length
  const myLabels = Array.from({ length: numDataPoints }, (_, i) => (i * props.pointDistance / 1000).toFixed(0))
  const myDataset = segment.map((_) => _.elevation)

  chartInstance.data = {
    datasets: [{ data: myDataset }],
    labels: myLabels
  }

  const eps: ElevationPoint[] = segment.map((_, i) => ({ distance: i * props.pointDistance, elevation: _.elevation }))
  const areaProperties = createAreaProperties(eps)

  if (
    chartInstance.options.plugins &&
    chartInstance.options.plugins.ascentFillPlugin !== undefined
  ) {
    chartInstance.options.plugins.ascentFillPlugin = { data: areaProperties }
  }
  chartInstance.update();
}

// 🧭 Log whenever trackCoords changes
watch(
  () => props.trackCoords,
  (newTrackSegment) => {
    //console.log('🟦 Track coordinates updated:', newTrackSegment);

    // Optionally update chart if it already exists
    if (chartInstance === null) {
      console.warn("chartInstance is null")
    } else if (newTrackSegment.length === 0) {
      console.warn("TrackSegment has null length")
    } else {
      updateChart(chartInstance, newTrackSegment)
    }
  },
  { immediate: false }
);

let mouseX: number | null = null;

// Plugin to draw vertical line at mouseX
const verticalLinePlugin: Plugin<'line'> = {
  id: 'verticalLine',
  afterDraw: (chart) => {
    if (mouseX === null) return;

    const ctx = chart.ctx;
    const topY = chart.chartArea.top;
    const bottomY = chart.chartArea.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mouseX, topY);
    ctx.lineTo(mouseX, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.stroke();
    ctx.restore();
  }
};


const ascentFillPlugin: Plugin<'line'> = {
  id: 'ascentFillPlugin',

  afterDatasetDraw(chart) {
    const { ctx, chartArea: { bottom } } = chart;

    const dataSets = chart.config.data.datasets
    if (dataSets.length === 0) return

    const yScale = chart.scales.y;
    const xScale = chart.scales.x;
    if (xScale.type !== 'category') {
      console.log(`Need x-axis scale type 'category', not ${xScale.type}`)
      return
    }

    const meta = chart.getDatasetMeta(0)
    if (meta.type !== 'line') return; // Only apply to line charts

    // crazy
    function hasProperty<T extends object, K extends PropertyKey>(
      x: unknown,
      prop: K
    ): x is T & Record<K, unknown> {
      return typeof x === 'object' && x !== null && !Array.isArray(x) && prop in x;
    }

    // returns { index: number, y: number }[] - index is not really useful as it should be 0, 1, 2 ... etc ... ( same as array index )
    const parsedData: IndexedPoint[] = [] // meta.data.map(element => element.$context.parsed) as { x: number; y: number }[]; // not good, needs checking

    // check each element for correct type and create list of points
    meta.data.forEach((element, idx) => {
      const u = element as unknown
      if (!hasProperty(u, '$context')) {
        console.log(`Element with index ${idx} does not have $context property`)
        return
      }
      const ctxt = u.$context
      if (!hasProperty(ctxt, 'parsed')) {
        console.log(`Element context with index ${idx} does not have parsed property`)
        return
      }
      const dataPoint = ctxt.parsed
      if (hasProperty(dataPoint, 'x') && hasProperty(dataPoint, 'y')) {
        // hacky at the end
        parsedData.push({ index: Number(dataPoint.x), y: Number(dataPoint.y) })
      }
    })

    // Translate to our distance in x . Will create a list of [ x, y ]
    const myPoints: XYPoint[] = parsedData.map((_, i) => ({ x: i * props.pointDistance, y: _.y }))

    function calcColors(points: XYPoint[]): string[] {
      const colorList: string[] = []

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const x1 = p1.x
        const y1 = p1.y

        const p2 = points[i + 1];
        const x2 = p2.x
        const y2 = p2.y

        const ascent = (y2 - y1) / (x2 - x1);

        const color = ascent < 0 ? 'rgba(55, 134, 55, 1)' : 'rgba(153, 15, 36, 1)'; //  green or  red
        colorList.push(color)
      }
      return colorList
    }

    ctx.save();

    const colors = calcColors(myPoints)
    colors.forEach((color, index) => {

      const x1 = xScale.getPixelForValue(parsedData[index].index);
      const y1 = yScale.getPixelForValue(parsedData[index].y);
      const x2 = xScale.getPixelForValue(parsedData[index + 1].index);
      const y2 = yScale.getPixelForValue(parsedData[index + 1].y);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, bottom);
      ctx.lineTo(x1, bottom);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeStyle = color;
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();

  }
};

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
          label: 'Elevation (m)',
          data: [],
          borderColor: 'blue',
          fill: false
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
        legend: { display: false },
        ascentFillPlugin: { data: [] }
      },
      elements: {
        point: {
          radius: 2,
          pointStyle: 'circle'
        },
      }
    },
    plugins: [verticalLinePlugin, ascentFillPlugin]
  });

  // Track mouse position relative to canvas
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    if (chartInstance) {
      chartInstance.draw(); // Trigger redraw
    }
  });

  canvas.addEventListener('mouseleave', () => {
    mouseX = null;
    if (chartInstance) {
      chartInstance.draw(); // Clear the line
    }
  });

  // if (props.trackCoords.length) {
  //   updateChart(chartInstance, props.trackCoords)
  // } else {
  //   console.log('⛔ No track coordinates provided during onMount.');
  // }

  // Add mousemove event listener for highlighting points

  if (chartInstance === null || !chartInstance) {
    console.warn('⛔ Chart instance is not initialized. Cannot add event listener');
  } else {
    canvas.addEventListener('mousemove', (event) => {
      // Get mouse position relative to canvas
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
      emit('highlight-xvalue', xValue);
    })
  }
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 300px;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
