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
import { createAscentFillPlugin } from './lib/AscentFillPlugin';
import { createVerticalLinePlugin } from './lib/VerticalLinePlugin';
import type { VerticalLinePlugin } from './lib/VerticalLinePlugin';


// 👇 Define props using defineProps
const props = defineProps<{
  trackCoords: TrackSegment; // TrackSegment with equidistant points
  pointDistance: number;
  cursorIndex: number | null; // Vertical line cursor index value
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

// Plugin to draw vertical line at mouseX
const verticalLinePlugin = createVerticalLinePlugin()
// Plugin to fill area below chart
const ascentFillPlugin = createAscentFillPlugin(props.pointDistance)

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
        verticalLinePlugin: { xPositionManualDraw: null }
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
  // watch vertical cursor external change
  watch(
    () => props.cursorIndex,
    (newIndex) => {
      //console.log("New index: ", newIndex)
      if (newIndex === null) return
      if (chartInstance &&
        chartInstance.data.labels &&
        chartInstance.data.labels.length > 0 &&
        chartInstance.config.plugins
      ) {
        const pixelX = chartInstance.scales['x'].getPixelForValue(newIndex); // e.g. 'March'
        //console.log("Pixel X", pixelX)
        //        const pluginInstance = Chart.registry.plugins.get('verticalLinePlugin');
        const pluginInstance = verticalLinePlugin;
        if (pluginInstance !== undefined) {
          chartInstance.draw();
          (pluginInstance as VerticalLinePlugin)._draw(chartInstance, pixelX);
        }
      }
    }
  )


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
