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
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, transform } from 'ol/proj';
import OlFeature from 'ol/Feature';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString, MultiLineString as GeoJsonMultiLineString } from 'geojson'
import type { Geometry as OlGeometry, LineString as OlLineString, MultiLineString as OlMultiLineString } from 'ol/geom';
import { isEmpty } from 'ol/extent';
import { TrackPointIndex } from '@/lib/TrackPointIndex';
import { MarkerOnTrack } from '@/lib/mapViewHelpers'
import { getMapElements } from '@/lib/mapView/trackLayers';


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

  // ------- watcher to update track 
  watch(() => props.lineStringF, (lineString) => {
    if (lineString === null) return

    const mapFeatureBaseTrack = geojsonFeature2mapFeature(lineString) as OlFeature<OlLineString>
    if (props.overlayLineStringF === null) { throw new Error("This should not happen. computed property is empty") }
    const mapFeatureOverlayTracks = geojsonFeature2mapFeature(props.overlayLineStringF) as OlFeature<OlLineString>

    const geometry = mapFeatureBaseTrack.getGeometry()
    if (geometry === undefined) { return }
    const mapCoordinates = geometry.getCoordinates() // 3857

    baseTrackVectorSource.clear()
    baseTrackVectorSource.addFeature(mapFeatureBaseTrack)

    overlayVectorSource.clear()
    overlayVectorSource.addFeature(mapFeatureOverlayTracks)

    // initialize marker
    marker.setCoordinates(mapCoordinates)

    // Update TrackpointIndex
    const points = mapCoordinates.map(coord => {
      // convert to epsg 4326
      const [lon, lat] = transform(coord, 'EPSG:3857', 'EPSG:4326');
      return { lon, lat };
    })
    tpIndex = new TrackPointIndex(points)

    if (map && props.zoomOnUpdate) {
      zoomToTrack(map, baseTrackVectorSource)
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

function geojsonFeature2mapFeature(feature: GeoJsonFeature<GeoJsonLineString | GeoJsonMultiLineString>) {

  // incoming format: EPSG:3857 ( gpx )
  const mapFeature = new GeoJSON().readFeature(
    feature,
    {
      dataProjection: 'EPSG:4326', // lat lon
      featureProjection: 'EPSG:3857' // projection of map
    }
  )

  if (feature.geometry.type === 'LineString') {
    return mapFeature as OlFeature<OlLineString>
  } else if (feature.geometry.type === 'MultiLineString') {
    return mapFeature as OlFeature<OlMultiLineString>
  } else {
    throw new Error("Feature is not of expected types LineString / MultiLineString")
  }
}

function zoomToTrack(map: Map, source: VectorSource<OlFeature<OlGeometry>>,) {
  const extent = source.getExtent();
  if (!isEmpty(extent)) {
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: 17,
      duration: 1000
    });
    map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 800 });
  }
}



</script>

<style scoped>
.map {
  width: 100%;
  height: 400px;
}
</style>
