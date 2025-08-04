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
    return { trackPoints };
  }
});

</script>

<template>
  <div>
    <h1>You did it!</h1>
    <p>
      Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
      documentation
    </p>
    <MapView @track-loaded="trackPoints = $event" />
    <ElevationChart :trackCoords="trackPoints" />
  </div>
</template>

<style scoped></style>
