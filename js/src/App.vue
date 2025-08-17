<script setup lang="ts">
import MapView from './MapView.vue';
import ElevationChart from './ElevationChart.vue';
import { ref, onMounted } from 'vue';
import { GeoJsonLoader } from './lib/GeoJsonLoader';
import type { TrackData, TrackSegment } from './lib/TrackData'
import { makeEquidistantTrackAkima } from './lib/InterpolateSegment';
import type { TrackSegmentWithDistance } from './lib/InterpolateSegment';
import type { FeatureCollection, Feature, LineString } from 'geojson';
import { Track2GeoJson } from './lib/Track2GeoJson';


const POINT_DISTANCE = 100; // Distance in meters for equidistant points

const lineStringFeature = ref<Feature<LineString> | null>(null)
const interpolatedSegment = ref<TrackSegmentWithDistance>([])
const elevationChartMouseXValue = ref<number | null>(null);
const mapViewMouseIndexValue = ref<number | null>(null);

// const maxDistance = ref<number>(0)

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

  // Interpolation
  let segmentEquidistant: TrackSegmentWithDistance
  try {
    segmentEquidistant = makeEquidistantTrackAkima(segment, POINT_DISTANCE)
  } catch (e) {
    console.error('Failed to create equidistant segment:', e);
    return
  }

  // not needed ?
  // maxDistance.value = segmentEquidistant[segmentEquidistant.length - 1].distanceFromStart

  interpolatedSegment.value = segmentEquidistant

  // get geojson from interpolated segment
  const interpolatedLineStringFeature = new Track2GeoJson(segmentEquidistant).toGeoJsonLineStringFeature()
  lineStringFeature.value = interpolatedLineStringFeature

})


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
      <ElevationChart :cursor-index="mapViewMouseIndexValue" :trackCoords="interpolatedSegment"
        @highlight-xvalue="elevationChartMouseXValue = $event" :point-distance=POINT_DISTANCE />
    </div>
  </div>
</template>

<style scoped></style>
