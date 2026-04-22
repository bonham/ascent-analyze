<template>
  <div ref="mapContainer" class="map px-1" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import ImageTile from 'ol/ImageTile';
import { fromLonLat, transform } from 'ol/proj';
import type { Feature as GeoJsonFeature, LineString as GeoJsonLineString, MultiLineString as GeoJsonMultiLineString } from 'geojson'
import { TrackPointIndex } from '@/lib/mapView/TrackPointIndex';
import { MarkerOnTrack } from '@/lib/mapView/mapViewHelpers'
import { getMapElements } from '@/lib/mapView/trackLayers';
import { geojsonLineString2OpenLayersLineString, geojsonMultiLineString2OpenLayersMultiLineString } from '@/lib/mapView/geoJson2MapFeature';
import { zoomToTrack } from '@/lib/mapView/zoomToTrack';
import type { MapBrowserEvent } from 'ol';
import type { TrackPoint, CursorSync } from '@/lib/elevationSync/types';

let map: Map;
let tpIndex: TrackPointIndex | undefined

const mapContainer = ref<HTMLDivElement | null>(null);

const props = defineProps<{
  cursor: CursorSync;                                           // shared cursor — receives hover index, drives marker
  points: TrackPoint[] | null;                                  // used to look up distance at hover index
  lineStringF: GeoJsonFeature<GeoJsonLineString> | null;
  overlayLineStringF: GeoJsonFeature<GeoJsonMultiLineString> | null;
  zoomOnUpdate: boolean;
}>();

const {
  baseTrackVectorSource,
  baseTrackVectorLayer,
  overlayVectorSource,
  overlayVectorLayer,
  markerSource,
  markerLayer,
} = getMapElements()

const marker = new MarkerOnTrack(markerSource)

onMounted(async () => {
  if (!mapContainer.value) return;

  const defaultCenter = fromLonLat([8.67673, 49.41053]);
  const defaultZoom = 7; // country-level view, roughly central Europe

  // ---- setup map (all OL coordinates are EPSG:3857 / Web Mercator internally) ----
  map = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({
        source: new OSM({
          tileLoadFunction: (tile, src) => {
            const img = (tile as ImageTile).getImage() as HTMLImageElement;
            img.referrerPolicy = 'strict-origin-when-cross-origin';
            img.src = src;
          },
        }),
      }),
      baseTrackVectorLayer,
      overlayVectorLayer,
      markerLayer,
    ],
    view: new View({
      center: defaultCenter,
      zoom: defaultZoom,
    }),
  });

  // ---- watcher: update base track geometry and rebuild TrackPointIndex ----
  watch(() => props.lineStringF, (lineString) => {
    if (lineString === null) return

    // render track on map
    const mapFeatureBaseTrack = geojsonLineString2OpenLayersLineString(lineString)
    baseTrackVectorSource.clear()
    baseTrackVectorSource.addFeature(mapFeatureBaseTrack)

    // initialise marker coordinate list (EPSG:3857)
    const geometry = mapFeatureBaseTrack.getGeometry()
    if (geometry === undefined) return
    const mapCoordinates = geometry.getCoordinates() // EPSG:3857
    marker.setCoordinates(mapCoordinates)

    // build TrackPointIndex in WGS-84 (EPSG:4326) for nearest-point lookups
    const latLonPoints = mapCoordinates.map(coord => {
      const [lon, lat] = transform(coord, 'EPSG:3857', 'EPSG:4326') as [number, number];
      return { lon, lat };
    })
    tpIndex = new TrackPointIndex(latLonPoints)

    if (map && props.zoomOnUpdate) {
      zoomToTrack(map, baseTrackVectorSource)
    }
  }, { immediate: true })

  // ---- watcher: update slope-colour overlay ----
  watch(() => props.overlayLineStringF, (newOverlay) => {
    if (newOverlay === null) return
    updateOverlay(newOverlay)
  }, { immediate: true })

  // ---- watcher: cursor → marker — respond to external index changes (e.g. chart hover) ----
  watch(
    () => props.cursor.nearestIndex.value,
    (newIndex) => {
      if (newIndex === null) {
        marker.clear()
      } else {
        marker.setByIndex(newIndex)
      }
    },
  )

  // ---- map pointer → cursor: translate pointer position to track distance ----
  map.on('pointermove', evt => {
    if (evt.dragging) return // ignore drag panning (especially on touch devices)
    handlePointerMove(evt)
  })
  map.on('click', evt => {
    handlePointerMove(evt)
  })

  function handlePointerMove(evt: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) {
    const coordinate = map.getCoordinateFromPixel(evt.pixel);
    const [lon, lat] = transform(coordinate, 'EPSG:3857', 'EPSG:4326') as [number, number];

    const closestIndex = tpIndex ? (tpIndex.getNearestIndex({ lon, lat }) ?? -1) : -1

    if (closestIndex !== -1 && props.points) {
      const pt = props.points[closestIndex]
      if (pt !== undefined) {
        marker.setByIndex(closestIndex)
        props.cursor.setByDistance(pt.distance)
      }
    } else {
      if (closestIndex !== -1 && !props.points) {
        // track index exists but distance data is missing — parent likely hasn't passed points yet
        console.warn('MapView: nearest index found but props.points is not available')
      }
      marker.clear()
    }
  }
});

function updateOverlay(lineStringFeature: GeoJsonFeature<GeoJsonMultiLineString>) {
  // caller must guard against null — all call sites do so before reaching here
  if (!lineStringFeature) throw new Error('updateOverlay called with falsy feature — this should not happen')
  const mapFeatureOverlayTracks = geojsonMultiLineString2OpenLayersMultiLineString(lineStringFeature)
  overlayVectorSource.clear()
  overlayVectorSource.addFeature(mapFeatureOverlayTracks)
}
</script>

<style scoped>
.map {
  width: 100%;
  height: 350px;
}
</style>
