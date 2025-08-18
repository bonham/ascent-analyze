<script setup lang="ts">
import MapView from './MapView.vue';
import ElevationChart from './ElevationChart.vue';
import { ref, onMounted } from 'vue';
import { GeoJsonLoader } from './lib/GeoJsonLoader';
import { TrackSegmentIndexed } from './lib/TrackData'
import type { TrackData, TrackSegment } from './lib/TrackData'
import { makeEquidistantTrackAkima } from './lib/InterpolateSegment';
import type { FeatureCollection, Feature, LineString } from 'geojson';
import { Track2GeoJson } from './lib/Track2GeoJson';


const POINT_DISTANCE = 100; // Distance in meters for equidistant points
const ZOOMWINDOW = 31 // in index numbers


const lineStringFeature = ref<Feature<LineString> | null>(null)
const elevationChartSegment = ref<TrackSegmentIndexed | null>(null)
const elevationChartMouseXValue = ref<number | null>(null);
const mapViewMouseIndexValue = ref<number | null>(null);

// Interpolated full segment after initial load
let initialSegmentIndexed: TrackSegmentIndexed

// Load a geojson file
async function loadGeoJson(): Promise<FeatureCollection<LineString>> {
  const response = await fetch('/kl.json');
  const geojson = await response.json();
  return geojson
}

// extract first segment from first track
function extractFirstSegmentFirstTrack(tracks: TrackData[]): TrackSegment {
  if (tracks.length === 0) {
    console.log("No tracks found in input")
    return []
  } else {
    if (tracks.length > 1) console.log(`Found ${tracks.length} tracks. Only first one will be processed.`)
    const segments = tracks[0].getSegments()
    const numSegments = segments.length
    if (numSegments === 0) {
      console.log("No segments found in track.")
      return []
    }
    else {
      if (numSegments > 1) {
        console.log(`Found ${numSegments} segments in track. Only first one will be processed`)
      }
      return segments[0]
    }
  }
}

onMounted(async () => {

  // loading the data should be done after mounted and all child components are ready ( chart, map )

  // Load the track data when the component is mounted
  let geojson: FeatureCollection<LineString>;
  try {
    geojson = await loadGeoJson()
  } catch (e) {
    console.error('Failed to load track data:', e);
    return
  }

  // Convert from geojson to list of track objects
  const tracks = GeoJsonLoader.loadFromGeoJson(geojson);

  // Only first segment is taken into account
  const segment = extractFirstSegmentFirstTrack(tracks)

  try {
    // interpolate
    const segmentEquidistant = makeEquidistantTrackAkima(segment, POINT_DISTANCE)
    initialSegmentIndexed = new TrackSegmentIndexed(segmentEquidistant, POINT_DISTANCE)
  } catch (e) {
    console.error('Failed to create equidistant segment:', e);
    return
  }


  updateSubComponents(initialSegmentIndexed)

})

function updateSubComponents(newTrack: TrackSegmentIndexed) {
  elevationChartSegment.value = newTrack

  const newGeoJson = new Track2GeoJson(newTrack.getSegment()).toGeoJsonLineStringFeature()
  lineStringFeature.value = newGeoJson
}

function zoomIn(xValue: number) {
  if (initialSegmentIndexed === undefined) return

  console.log("xval:", xValue)

  const desiredMiddle = xValue

  const half = Math.floor(ZOOMWINDOW / 2)
  const leftside = Math.max(0, desiredMiddle - half)
  const rightside = Math.min(leftside + ZOOMWINDOW, initialSegmentIndexed.length() - 1)

  const zoomSegment = initialSegmentIndexed.slice(leftside, rightside)
  updateSubComponents(zoomSegment)
}

function zoomOut() {
  if (initialSegmentIndexed === undefined) return
  updateSubComponents(initialSegmentIndexed)
}

function handleZoomEvent(xValue: number, deltaY: number) {
  if (deltaY > 0) {
    zoomOut();
  } else {
    zoomIn(xValue);
  }
}


</script>

<template>
  <div class="container py-4 px-3 mx-auto">
    <h1>You did it!</h1>
    <p>
      Elevation analyzer
    </p>
    <div class="row my-3">
      <MapView :highlightXpos="elevationChartMouseXValue" :line-string-f="lineStringFeature"
        @hover-index="mapViewMouseIndexValue = $event" />
    </div>
    <div class="row my-3">
      <ElevationChart :cursor-index="mapViewMouseIndexValue" :trackCoords="elevationChartSegment"
        @highlight-xvalue="elevationChartMouseXValue = $event" :point-distance=POINT_DISTANCE @zoom="handleZoomEvent" />
    </div>
    <div>
      <button @click="zoomIn(15)">Zoom in</button>
      <button @click="zoomOut()">Zoom out</button>
    </div>
  </div>
</template>

<style scoped></style>
