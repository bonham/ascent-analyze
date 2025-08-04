<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';

// 👇 Define props using defineProps
const props = defineProps<{
  trackCoords: number[][]; // [lon, lat, elevation]
}>();

// const emit = defineEmits<{
//   (e: 'highlight-point', index: number): void;
// }>();

// 👇 Canvas reference
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 👇 Chart instance holder
let chartInstance: Chart | null = null;

// 🧭 Log whenever trackCoords changes
watch(
  () => props.trackCoords,
  (newVal) => {
    console.log('🟦 Track coordinates updated:', newVal);
    // Optionally update chart if it already exists
    if (chartInstance && newVal.length) {
      chartInstance.data.labels = newVal.map((_, i) => i * 10);
      chartInstance.data.datasets[0].data = newVal.map((p) => p[2]);
      chartInstance.update();
    }
  },
  { immediate: true }
);

// 🎨 Initialize chart once on mount
onMounted(() => {
  if (!canvasRef.value) {
    console.warn('⛔ Canvas unavailable during mount.');
    return;
  }
  if (!props.trackCoords.length) {
    console.log('⛔ No track coordinates provided yet.');
  }

  const elevations = props.trackCoords.map((p) => p[2]);
  const distances = props.trackCoords.map((_, i) => i * 10); // adjust spacing if needed

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels: distances,
      datasets: [
        {
          label: 'Elevation (m)',
          data: elevations,
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
