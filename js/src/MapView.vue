<template>
  <div ref="mapContainer" class="map" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
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
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

let coords: number[][]
let map: Map;

const mapContainer = ref<HTMLDivElement | null>(null);

const props = defineProps<{
  selectedIndex: number | null; // Index of the selected point to highlight
}>();

const emit = defineEmits<{
  (e: 'track-loaded', coords: number[][]): void;
}>();

const markerSource = new VectorSource();
const markerLayer = new VectorLayer({
  source: markerSource,
  style: new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: 'red' }) // Customize your highlight color here
    })
  })
});

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
  coords = geojson.features[0].geometry.coordinates;
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


  map = new Map({
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
  map.addLayer(markerLayer);
  // Automatically fit the view to the extent of the vector data
  map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 800 });



});

watch(() => props.selectedIndex, (newIndex) => {
  if (newIndex === null || !coords || newIndex < 0 || newIndex >= coords.length) {
    console.warn('⛔ Invalid index for highlighting:', newIndex);
    markerSource.clear(); // Clear marker if no valid index
    return;
  }
  const coord = coords[newIndex]; // [lon, lat, elev]
  if (!coord) return;

  const projected = fromLonLat([coord[0], coord[1]]);

  markerSource.clear(); // Remove old marker

  const marker = new Feature({
    geometry: new Point(projected)
  });

  markerSource.addFeature(marker); // Add new marker
});





</script>

<style scoped>
.map {
  width: 100%;
  height: 400px;
}
</style>
