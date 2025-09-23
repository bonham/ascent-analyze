<template>
  <div ref="mapContainer" class="map" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { fromLonLat, transform } from 'ol/proj';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString, MultiLineString as GeoJsonMultiLineString } from 'geojson'
import { TrackPointIndex } from '@/lib/mapView/TrackPointIndex';
import { MarkerOnTrack } from '@/lib/mapView/mapViewHelpers'
import { getMapElements } from '@/lib/mapView/trackLayers';
import { geojsonLineString2OpenLayersLineString, geojsonMultiLineString2OpenLayersMultiLineString } from '@/lib/mapView/geoJson2MapFeature';
import { zoomToTrack } from '@/lib/mapView/zoomToTrack';


let map: Map;
let tpIndex: TrackPointIndex | undefined

const mapContainer = ref<HTMLDivElement | null>(null);

const props = defineProps<{
  highlightXpos: number | null; // Index of the selected point to highlight
  lineStringF: GeoJsonFeature<GeoJsonLineString> | null;
  overlayLineStringF: GeoJsonFeature<GeoJsonMultiLineString> | null;
  zoomOnUpdate: boolean
}>();

const emit = defineEmits<{
  (e: 'hoverIndex', index: number): void;
}>();

const {
  baseTrackVectorSource,
  baseTrackVectorLayer,
  overlayVectorSource,
  overlayVectorLayer,
  markerSource,
  markerLayer
} = getMapElements()

const marker = new MarkerOnTrack(markerSource)


// -----------------------------------------------------------------
onMounted(async () => {


  // ---- setup layer
  if (!mapContainer.value) return;

  const defaultCenter = fromLonLat([8.67673, 49.41053]);
  const defaultZoom = 7;                    // World view

  // ---- setup map
  map = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({ source: new OSM() }),
      baseTrackVectorLayer,
      overlayVectorLayer,
      markerLayer
    ],
    view: new View({ // default projection is EPSG:3857
      center: defaultCenter,
      zoom: defaultZoom
    })
  });

  // ---------------    watcher to update track    ------------------
  watch(() => props.lineStringF, (lineString) => {

    if (lineString === null) return

    // Update base track in map
    const mapFeatureBaseTrack = geojsonLineString2OpenLayersLineString(lineString)
    baseTrackVectorSource.clear()
    baseTrackVectorSource.addFeature(mapFeatureBaseTrack)

    // initialize marker
    const geometry = mapFeatureBaseTrack.getGeometry()
    if (geometry === undefined) { return }
    const mapCoordinates = geometry.getCoordinates() // 3857
    marker.setCoordinates(mapCoordinates)

    // Update TrackpointIndex for emitting events
    const points = mapCoordinates.map(coord => {
      // convert to epsg 4326
      const [lon, lat] = transform(coord, 'EPSG:3857', 'EPSG:4326');
      return { lon, lat };
    })
    tpIndex = new TrackPointIndex(points)


    if (map && props.zoomOnUpdate) {
      zoomToTrack(map, baseTrackVectorSource)
    }

  }, { immediate: true })

  // ---------------    watcher to update slope overlay  ------------
  watch(() => props.overlayLineStringF, (newOverlayLinestring) => {
    if (newOverlayLinestring === null) return
    updateOverlay(newOverlayLinestring)
  }, { immediate: true })

  // ---- Watch for commands from outside component to draw / move the point marker on the track ------------------
  watch(() => props.highlightXpos, (newXposIndex) => {

    if (newXposIndex === null) {
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

  }, { immediate: true });

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

function updateOverlay(lineStringFeature: GeoJsonFeature<GeoJsonMultiLineString>) {

  if (props.overlayLineStringF === null) { throw new Error("This should not happen. computed property is empty") }
  const mapFeatureOverlayTracks = geojsonMultiLineString2OpenLayersMultiLineString(lineStringFeature)

  overlayVectorSource.clear()
  overlayVectorSource.addFeature(mapFeatureOverlayTracks)
}



</script>

<style scoped>
.map {
  width: 100%;
  height: 400px;
}
</style>
