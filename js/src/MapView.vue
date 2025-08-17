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
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import { fromLonLat, transform } from 'ol/proj';
import Feature from 'ol/Feature';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString } from 'geojson'
import type { LineString } from 'ol/geom';
import { isEmpty } from 'ol/extent';
import { TrackPointIndex } from './lib/TrackPointIndex';
import { MarkerOnTrack } from './lib/mapViewHelpers'


let map: Map;
let tpIndex: TrackPointIndex | undefined

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
const marker = new MarkerOnTrack(markerSource)
const trackVectorSource = new VectorSource()

// -----------------------------------------------------------------
onMounted(async () => {


  // ---- setup layer
  if (!mapContainer.value) return;

  const trackStyle = new Style({
    stroke: new Stroke({
      color: 'blue',       // Or any CSS color
      width: 4             // Adjust thickness here
    })
  });

  const vectorLayer = new VectorLayer({
    source: trackVectorSource,
    style: trackStyle      // Apply the custom style
  });

  const defaultCenter = fromLonLat([0, 0]); // Center on Null Island 🌍
  const defaultZoom = 2;                    // World view

  // ---- setup map
  map = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({ source: new OSM() }),
      vectorLayer
    ],
    view: new View({ // default projection is EPSG:3857
      center: defaultCenter,
      zoom: defaultZoom
    })
  });
  map.addLayer(markerLayer);

  // ------- watcher to update track 
  watch(() => props.lineStringF, (lineString) => {
    if (lineString === null) return

    // incoming format: EPSG:3857 ( gpx )
    const mapFeature = new GeoJSON().readFeature(
      lineString,
      {
        dataProjection: 'EPSG:4326', // lat lon
        featureProjection: 'EPSG:3857' // projection of map
      }
    ) as Feature<LineString>

    const mapCoordinates = mapFeature.getGeometry()!.getCoordinates() // 3857

    // make array and convert types
    trackVectorSource.clear()
    trackVectorSource.addFeature(mapFeature)

    // initialize marker
    marker.setCoordinates(mapCoordinates)

    // Update TrackpointIndex
    const points = mapCoordinates.map(coord => {
      // convert to epsg 4326
      const [lon, lat] = transform(coord, 'EPSG:3857', 'EPSG:4326');
      return { lon, lat };
    })
    tpIndex = new TrackPointIndex(points)

    if (map) {
      const extent = trackVectorSource.getExtent();
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

  // ---- Watch for commands from outside component to draw / move the point marker on the track
  watch(() => props.highlightXpos, (newXposIndex) => {

    if (newXposIndex === null) {
      console.warn('new x pos is null');
      marker.clear();
      return;
    }

    if (newXposIndex < 0) {
      marker.clear(); // Clear marker if no valid index
    }


    // Obtain track coordinates
    if (props.lineStringF === null) {
      console.warn("LineString is null in MapViewProperty")
      return
    }

    marker.setByIndex(newXposIndex)

  });

  // add listener to identify mouse near track
  map.on('pointermove', evt => {
    const coordinate = map.getCoordinateFromPixel(evt.pixel);
    const [lon, lat] = transform(coordinate, 'EPSG:3857', 'EPSG:4326');

    //let minDist = Infinity;
    let closestIndex = -1;

    if (tpIndex) {
      closestIndex = tpIndex.getNearestIndex({ lon, lat }) ?? -1
    }


    if (closestIndex !== -1) {
      marker.setByIndex(closestIndex)
      emit('hoverIndex', closestIndex);
    } else {
      marker.clear()
    }

  });
});





</script>

<style scoped>
.map {
  width: 100%;
  height: 400px;
}
</style>
