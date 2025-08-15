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
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString } from 'geojson'
import Point from 'ol/geom/Point';
import type { LineString } from 'ol/geom';
import { isEmpty } from 'ol/extent';

let map: Map;
const vectorSource = new VectorSource()

const mapContainer = ref<HTMLDivElement | null>(null);

const props = defineProps<{
  highlightXpos: number | null; // Index of the selected point to highlight
  lineStringF: GeoJsonFeature<GeoJsonLineString> | null;
}>();

const emit = defineEmits<{
  (e: 'hoverIndex', index: number): void;
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


  // only add feature to source if we have data:
  if (props.lineStringF !== null) {

    const feature = new GeoJSON().readFeature(
      props.lineStringF,
      {
        featureProjection: 'EPSG:3857'
      }
    )
    // make array and convert types
    vectorSource.addFeature(feature as unknown as Feature<LineString>)
  }



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

  const defaultCenter = fromLonLat([0, 0]); // Center on Null Island 🌍
  const defaultZoom = 2;                    // World view

  map = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({ source: new OSM() }),
      vectorLayer
    ],
    view: new View({
      center: defaultCenter,
      zoom: defaultZoom
    })
  });
  map.addLayer(markerLayer);

  // Automatically fit the view to the extent of the vector data
  if (props.lineStringF !== null) {
    const extent = vectorSource.getExtent();
    if (!isEmpty(extent)) {
      map.getView().setCenter(getCenter(extent))
      map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 800 });
    }

  }

  // add listener to identify mouse near track
  map.on('pointermove', evt => {
    const coordinate = map.getCoordinateFromPixel(evt.pixel);

    let minDist = Infinity;
    let closestIndex = -1;

    props.lineStringF?.geometry.coordinates.forEach((coord, i) => {
      const projected = fromLonLat([coord[0], coord[1]]);
      const dx = projected[0] - coordinate[0];
      const dy = projected[1] - coordinate[1];
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    });

    if (closestIndex !== -1) {
      emit('hoverIndex', closestIndex);
    }
  });
});

watch(() => props.lineStringF, (lineString) => {
  if (lineString === null) return

  const feature = new GeoJSON().readFeature(
    props.lineStringF,
    {
      featureProjection: 'EPSG:3857'
    }
  )
  // make array and convert types
  vectorSource.addFeature(feature as unknown as Feature<LineString>)

  if (map) {
    const extent = vectorSource.getExtent();
    if (!isEmpty(extent)) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 17,
        duration: 1000
      });
      map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 800 });
    }
  }

})

watch(() => props.highlightXpos, (newXpos) => {

  if (props.lineStringF === null) {
    console.warn("LineString is null in MapViewProperty")
    return
  }
  const coords = props.lineStringF.geometry.coordinates
  // todo -we need to change data treatment to calculate distances when loading the track. also the ElevationChart needs to use explicit distances. 
  // btw the dataset does not have equidistant points, so this is a bit of a hack. Need to spline interpolate the data to get equidistant points.

  if (newXpos === null || !coords || newXpos < 0) {
    console.warn('⛔ Invalid index for highlighting:', newXpos);
    markerSource.clear(); // Clear marker if no valid index
    return;
  }
  const coord = coords[newXpos]; // [lon, lat, elev]
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
