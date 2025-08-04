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
import { fromLonLat } from 'ol/proj';

export default defineComponent({
  name: 'MapView',
  setup() {
    const mapContainer = ref<HTMLDivElement | null>(null);

    // Hardcoded GeoJSON-like track
    const geojsonTrack = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [8.691, 49.397, 120],
              [8.692, 49.398, 122],
              [8.693, 49.399, 125]
              // You can add more coordinates here
            ]
          },
          properties: {}
        }
      ]
    };

    onMounted(() => {
      if (!mapContainer.value) return;

      const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(geojsonTrack, {
          featureProjection: 'EPSG:3857'
        })
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const map = new Map({
        target: mapContainer.value,
        layers: [
          new TileLayer({ source: new OSM() }),
          new VectorLayer({ source: vectorSource })
        ],
        view: new View({
          center: fromLonLat([8.692, 49.398]),
          zoom: 14
        })
      });
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
