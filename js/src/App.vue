<script lang="ts">
import MapView from './MapView.vue';
import ElevationChart from './ElevationChart.vue';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'App',
  components: {
    MapView,
    ElevationChart
  },
  setup() {
    const trackPoints = ref<number[][]>([]);
    const selectedIndex = ref<number | null>(null);
    return { trackPoints, selectedIndex };
  }
});

</script>

<template>
  <div class="container py-4 px-3 mx-auto">
    <h1>You did it!</h1>
    <p>
      Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
      documentation
    </p>
    <MapView @track-loaded="trackPoints = $event" :selected-index="selectedIndex" />
    <ElevationChart :trackCoords="trackPoints" @highlight-point="selectedIndex = $event" />
  </div>
</template>

<style scoped></style>
