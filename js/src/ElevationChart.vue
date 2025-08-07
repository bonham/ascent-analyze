<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import type { TrackSegment } from './lib/TrackData';

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
let chartInstance: Chart | null = null;

function updateChart(chartInstance: Chart, segment: TrackSegment) {
  chartInstance.data.labels = segment.map((_, i) => i * props.pointDistance);
  chartInstance.data.datasets[0].data = segment.map((p) => p.elevation);
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

// 🎨 Initialize chart once on mount
onMounted(() => {

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
    options: {
      responsive: true,
      scales: {
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
