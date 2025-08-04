<template>
  <div ref="mapContainer" class="map" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
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


const mapContainer = ref<HTMLDivElement | null>(null);

const emit = defineEmits<{
  (e: 'track-loaded', coords: number[][]): void;
}>();

onMounted(async () => {
  if (!mapContainer.value) return;

  let geojson;
  try {
    const response = await fetch('/kl.json');
    geojson = await response.json();
  } catch (error) {
    console.error('Failed to load GeoJSON:', error);
  }
  // Extract coordinates from track and emit to parent
  const coords: number[][] = geojson.features[0].geometry.coordinates;
  emit('track-loaded', coords);


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



});


</script>

<style scoped>
.map {
  width: 100%;
  height: 400px;
}
</style>
