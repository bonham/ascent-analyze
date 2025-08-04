<template>
  <div ref="mapContainer" class="map" />
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { getCenter } from 'ol/extent';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';

export default defineComponent({
  name: 'MapView',
  emits: ['track-loaded'],
  setup(_, { emit }) {
    const mapContainer = ref<HTMLDivElement | null>(null);

    onMounted(async () => {
      if (!mapContainer.value) return;

      try {
        const response = await fetch('/kl.json');
        const geojson = await response.json();

        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(geojson, {
            featureProjection: 'EPSG:3857'
          })
        });

        const trackStyle = new Style({
          stroke: new Stroke({
            color: 'blue',       // Or any CSS color
            width: 4             // Adjust thickness here
          })
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: trackStyle      // Apply the custom style
        });
        const extent = vectorSource.getExtent();


        const map = new Map({
          target: mapContainer.value,
          layers: [
            new TileLayer({ source: new OSM() }),
            vectorLayer
          ],
          view: new View({
            center: getCenter(extent),
            zoom: 14
          })
        });
        // Automatically fit the view to the extent of the vector data
        map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 800 });

        // Extract coordinates from track and emit to parent
        const coords: number[][] = geojson.features[0].geometry.coordinates;
        emit('track-loaded', coords);

      } catch (error) {
        console.error('Failed to load GeoJSON:', error);
      }
    });

    return { mapContainer };
  }
});
</script>

<style scoped>
.map {
  width: 100%;
  height: 400px;
}
</style>
