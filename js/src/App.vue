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
import { ZoomEventQueue, ZoomManager } from './lib/appHelpers';


const POINT_DISTANCE = 100; // Distance in meters for equidistant points
//const ZOOMWINDOW = 31 // in index numbers

const lineStringFeature = ref<Feature<LineString> | null>(null)
const elevationChartSegment = ref<TrackSegmentIndexed | null>(null)
const elevationChartMouseXValue = ref<number | null>(null);
const mapViewMouseIndexValue = ref<number | null>(null);
const zoomMapOnUpdate = ref(false)
const slopeIntervals = ref<[number, number][]>([])

// Interpolated full segment after initial load
let initialSegmentIndexed: TrackSegmentIndexed
let zoomQueue: ZoomEventQueue

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

function analyzeAscent(seg: TrackSegment) {
  // analyze subsequent points

  // hill start : 5% über 500 m: entspricht 25 m über 500m - 5m pro 100m 

  const window1 = 5

  let hillStarted = false
  let hillStartIdx: null | number = null
  let hillStopIdx: null | number = null

  const intervals: [number, number][] = []

  for (let idx = window1 - 1; idx < seg.length; idx++) {

    const windowStartIdx = idx - window1 + 1

    const lastPoint = seg[windowStartIdx]
    const thisPoint = seg[idx]
    const elevationDelta = thisPoint.elevation - lastPoint.elevation

    if (!hillStarted) {
      if (elevationDelta >= 25) {
        hillStarted = true
        hillStartIdx = windowStartIdx
      }
    } else if (elevationDelta <= 0) {
      hillStarted = false
      hillStopIdx = windowStartIdx
      console.log("start stop: ", hillStartIdx, hillStopIdx)
      if (hillStartIdx === null) { throw new Error("Hill start is null") }
      intervals.push([hillStartIdx, hillStopIdx])
    }
  }
  return intervals
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

  const zoomManager = new ZoomManager(initialSegmentIndexed)
  zoomQueue = new ZoomEventQueue((centerIndex, factor) => {
    const newSegment = zoomManager.applyFactorInternal(centerIndex, factor)
    zoomMapOnUpdate.value = false
    updateElevationChart(newSegment, overlayIntervals)
  })

  const overlayIntervals = analyzeAscent(initialSegmentIndexed.getSegment())

  // initial update with zoom
  zoomMapOnUpdate.value = true
  updateMap(initialSegmentIndexed)
  updateElevationChart(initialSegmentIndexed, overlayIntervals)

})

/**
 * Updates Map 
 * @param newTrack New indexed track to use for updating 
 */
function updateMap(newTrack: TrackSegmentIndexed) {
  const newGeoJson = new Track2GeoJson(newTrack.getSegment()).toGeoJsonLineStringFeature()
  lineStringFeature.value = newGeoJson
}

/**
 * Updates Elevation Chart
 * @param newTrack New indexed track to use for updating 
 */
function updateElevationChart(newTrack: TrackSegmentIndexed, overlayIntervals: [number, number][]) {
  elevationChartSegment.value = newTrack
  slopeIntervals.value = overlayIntervals
}

/**
 * Handles event from elevation chart component
 * 
 * @param xValue index number of mouse position in chart
 * @param deltaY mouse wheel scroll value
 */
function handleZoomEvent(xValue: number, deltaY: number) {

  if (zoomQueue === undefined) return

  const ZOOMIN_INCREMENT_FACTOR = 0.7
  const DELTA_Y_NORM = 68 // mouse event if mousewheel sensitivity is reasonably normal
  let incrementalZoomFactor: number

  if (deltaY > 0) {
    // zoom out
    incrementalZoomFactor = Math.abs(deltaY) / (ZOOMIN_INCREMENT_FACTOR * DELTA_Y_NORM)
  } else {
    // zoom in
    incrementalZoomFactor = (ZOOMIN_INCREMENT_FACTOR * DELTA_Y_NORM) / Math.abs(deltaY)
  }
  //console.log("DeltaY", deltaY, "Inc zoom factor:", incrementalZoomFactor, "Xvalue:", xValue)
  zoomQueue.queue(xValue, incrementalZoomFactor)
}


</script>

<template>
  <div class="container py-4 px-3 mx-auto">
    <h1>You did it!</h1>
    <div>
      Elevation analyzer
      <button type="button" class="btn btn-primary">Analyze</button>
    </div>
    <div class="row my-3 py-3 border">
      <MapView :highlightXpos="elevationChartMouseXValue" :line-string-f="lineStringFeature"
        :zoom-on-update="zoomMapOnUpdate" @hover-index="mapViewMouseIndexValue = $event" />
    </div>
    <div class="row my-3 py-3 border">
      <ElevationChart :cursor-index="mapViewMouseIndexValue" :trackCoords="elevationChartSegment"
        :overlay-intervals="slopeIntervals" @highlight-xvalue="elevationChartMouseXValue = $event"
        :point-distance=POINT_DISTANCE @zoom="handleZoomEvent" />
    </div>
  </div>
</template>

<style scoped></style>
