<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import type { TrackSegment } from './lib/TrackData';

import type {

  Plugin
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
  chartInstance.data.labels = segment.map((_, i) => i * props.pointDistance);

  const numDataPoints = segment.length
  const myLabels = Array.from({ length: numDataPoints }, (_, i) => i * props.pointDistance)
  const myDataset = segment.map((_) => _.elevation)

  chartInstance.data = {
    datasets: [{ data: myDataset }],
    labels: myLabels
  }
  chartInstance.update();
}

// 🧭 Log whenever trackCoords changes
watch(
  () => props.trackCoords,
  (newTrackSegment) => {
    console.log('🟦 Track coordinates updated:', newTrackSegment);

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

// 🎨 Initialize chart once on mount
onMounted(() => {

  const scales = {
    x: {
      title: {
        display: true,
        text: 'Distance (m)'
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
          fill: false,
          tension: 0.1
        }
      ]
    },
    plugins: [verticalLinePlugin]
  });

  chartInstance.options.responsive = true
  chartInstance.options.maintainAspectRatio = false
  chartInstance.options.interaction = {
    mode: 'index',
    intersect: false
  }
  chartInstance.options.scales = scales
  chartInstance.options.plugins = {
    tooltip: { enabled: false },
    legend: { display: false }
  }


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
