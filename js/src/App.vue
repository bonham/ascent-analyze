<script setup lang="ts">
import MapView from './MapView.vue';
import ElevationChart from './ElevationChart.vue';
import { ref } from 'vue';

const trackPoints = ref<number[][]>([]);
const xValue = ref<number | null>(null);
</script>

<template>
  <div class="container py-4 px-3 mx-auto">
    <h1>You did it!</h1>
    <p>
      Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
      documentation
    </p>
    <MapView @track-loaded="trackPoints = $event" :highlightXpos="xValue" />
    <ElevationChart :trackCoords="trackPoints" @highlight-xvalue="xValue = $event" />
  </div>
</template>

<style scoped></style>
