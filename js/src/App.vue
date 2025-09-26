<script setup lang="ts">
import MapView from '@/components/MapView.vue';
import ElevationChart from '@/components/ElevationChart.vue';
import { ref, computed } from 'vue';
import { GeoJsonLoader } from '@/lib/GeoJsonLoader';
import { TrackSegmentIndexed } from '@/lib/TrackData'
import { makeEquidistantTrackAkima } from '@/lib/InterpolateSegment';
import type { FeatureCollection, Feature, MultiLineString } from 'geojson';
import { ZoomEventQueue, ZoomManager } from '@/lib/appHelpers';
import DropField from '@/components/DropField.vue';
import DropPanel from '@/components/DropPanel.vue';
import { analyzeAscent } from '@/lib/analyzeAscent'
import { extractFirstSegmentFirstTrack } from '@/lib/app/extractFirstSegmentFirstTrack';
import { Track2GeoJson } from '@/lib/Track2GeoJson';
import { readDroppedFile } from '@/lib/fileReader/readDroppedFile';


const START_TRIGGER_GRADIENT = 5 // in percent
const STOP_TRIGGER_GRADIENT = 1
const WINDOW_SIZE_METERS = 500; // in index numbers 
const POINT_DISTANCE = 100; // Distance in meters for equidistant points
//const ZOOMWINDOW = 31 // in index numbers

const featureCollection = ref<FeatureCollection>({ type: "FeatureCollection", features: [] })
const elevationChartSegment = ref<TrackSegmentIndexed | null>(null)
const elevationChartMouseXValue = ref<number | null>(null);
const mapViewMouseIndexValue = ref<number | null>(null);
const zoomMapOnUpdate = ref(false)
const windowSizeMeters = ref(WINDOW_SIZE_METERS)
const startGradient = ref(START_TRIGGER_GRADIENT)
const stopGradient = ref(STOP_TRIGGER_GRADIENT)

const windowSizePoints = computed(() => {
  const v = Math.round(windowSizeMeters.value / POINT_DISTANCE)
  return v < 2 ? 2 : v // minimum window size is 2 points
})

const startThreshold_m = computed(() => {
  // convert from gradient percent to meters
  return (startGradient.value * windowSizeMeters.value) / 100
})
const stopThreshold_m = computed(() => {
  // convert from gradient percent to meters
  return (stopGradient.value * windowSizeMeters.value) / 100
})

// computed
const trackSegmentIndexed = computed(() => {

  // Convert from geojson to list of track objects
  const tracks = GeoJsonLoader.loadFromGeoJson(featureCollection.value);

  // Only first segment is taken into account
  const segment = extractFirstSegmentFirstTrack(tracks)

  // interpolate
  const segmentEquidistant = makeEquidistantTrackAkima(segment, POINT_DISTANCE)
  const segmentIndexed = new TrackSegmentIndexed(segmentEquidistant, POINT_DISTANCE)
  return segmentIndexed
})

// computed lineStringFeature - depends on tracksegmentIndexed
const lineStringFeature = computed(() => {
  const segment = trackSegmentIndexed.value.getSegment()
  const t2g = new Track2GeoJson(segment)
  return t2g.toGeoJsonLineStringFeature()
})

// computed
const zoomManager = computed(() => new ZoomManager(trackSegmentIndexed.value))

// computed
const slopeIntervals = computed<[number, number][]>(() =>
  analyzeAscent(trackSegmentIndexed.value.getSegment(), startThreshold_m.value, stopThreshold_m.value, windowSizePoints.value)
)
const tableHighlightIndex = computed(() => {
  if (elevationChartMouseXValue.value === null) {
    return null
  } else {
    // find interval containing this index
    const idx = slopeIntervals.value.findIndex((intv) =>
      (elevationChartMouseXValue.value !== null) && (elevationChartMouseXValue.value >= intv[0]) && (elevationChartMouseXValue.value <= intv[1])
    )
    const returnIndex = idx >= 0 ? idx + 1 : null // return interval id (1-based)
    return returnIndex
  }
})

const intervalDetails = computed(() => {
  return slopeIntervals.value.map((intv, idx) => {
    const start = trackSegmentIndexed.value.get(intv[0])
    const end = trackSegmentIndexed.value.get(intv[1])
    const dist = (end.distanceFromStart - start.distanceFromStart)
    const elevGain = end.elevation - start.elevation
    const avgGradient = (elevGain / dist) * 100
    return {
      id: idx + 1,
      startIndex: intv[0],
      endIndex: intv[1],
      start_distance_m: start.distanceFromStart,
      interval_size_m: dist,
      elevationGain_m: elevGain,
      averageGradient_percent: avgGradient
    }
  })
})

// computed
const overlayLineStringFeature = computed<Feature<MultiLineString> | null>(() => {

  if (lineStringFeature.value === null) {
    return null
  } else {

    const coord = lineStringFeature.value.geometry.coordinates
    const mlsCoordinates = slopeIntervals.value.map(
      (intv) => coord.slice(intv[0], intv[1] + 1)
    )

    const multiLineString: MultiLineString = {
      type: "MultiLineString",
      coordinates: mlsCoordinates
    }

    const multiLineStringFeature: Feature<MultiLineString> = {
      type: "Feature",
      properties: {},
      geometry: multiLineString
    }
    return multiLineStringFeature
  }
})


const zoomQueue = new ZoomEventQueue((centerIndex, factor) => {
  const newSegment = zoomManager.value.applyFactorInternal(centerIndex, factor)
  zoomMapOnUpdate.value = false
  updateElevationChart(newSegment)
})


initialLoad().catch((err) => {
  console.error("Error in initial load:", err)
})

async function initialLoad(): Promise<void> {
  const response = await fetch('./kl.json');
  const geojson = await response.json();
  featureCollection.value = geojson
  zoomMapOnUpdate.value = true
  elevationChartSegment.value = trackSegmentIndexed.value
}


/**
 * Updates Elevation Chart
 * @param newTrack New indexed track to use for updating 
 */
function updateElevationChart(newTrack: TrackSegmentIndexed) {
  elevationChartSegment.value = newTrack
}

/********************** Event handling  **************************************/

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

/********************** File handling  **************************************/

async function processUploadFiles(files: FileList) {
  zoomMapOnUpdate.value = true
  featureCollection.value = await readDroppedFile(files)
  elevationChartSegment.value = trackSegmentIndexed.value
}




</script>

<template>
  <div class="container py-1 px-3 mx-auto">
    <nav class="row navbar bg-body-tertiary mb-2">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1">La Rampa</span>
        <DropPanel @files-dropped="processUploadFiles" />
      </div>
    </nav>
    <DropField @files-dropped="processUploadFiles">
      <div class="row border py-3">
        <MapView :highlightXpos="elevationChartMouseXValue" :line-string-f="lineStringFeature"
          :overlay-line-string-f="overlayLineStringFeature" :zoom-on-update="zoomMapOnUpdate"
          @hover-index="mapViewMouseIndexValue = $event" />
      </div>
    </DropField>
    <div class="row my-3 py-3 border">
      <ElevationChart :cursor-index="mapViewMouseIndexValue" :trackCoords="elevationChartSegment"
        :overlay-intervals="slopeIntervals" @highlight-xvalue="elevationChartMouseXValue = $event"
        :point-distance=POINT_DISTANCE @zoom="handleZoomEvent" />
    </div>
    <div class="row my-3">
      <table class="table table-sm table-bordered smallfont">
        <thead>
          <tr>
            <th>#</th>
            <th>Start (km)</th>
            <th>Length (km)</th>
            <th>Elev. Gain (m)</th>
            <th>Grad (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in intervalDetails" :key="item.id"
            :class="{ 'table-warning': item.id === tableHighlightIndex }">
            <td>{{ item.id }}</td>
            <td>{{ item.start_distance_m / 1000 }}</td>
            <td>{{ item.interval_size_m / 1000 }}</td>
            <td>{{ item.elevationGain_m.toFixed(0) }}</td>
            <td>{{ item.averageGradient_percent.toFixed(1) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
    <form class="row mb-3 g-2">
      <div class="col">
        <div class="input-group">
          <span class="input-group-text smallfont">Start %</span>
          <input type="text" class="form-control smallfont" v-model="startGradient">
        </div>
      </div>
      <div class="col">
        <div class="input-group">
          <span class="input-group-text smallfont">Stop %</span>
          <input type="text" class="form-control smallfont" v-model="stopGradient">
        </div>
      </div>
      <div class="col">
        <div class="input-group">
          <span class="input-group-text smallfont">Window</span>
          <input type="text" class="form-control smallfont" v-model="windowSizeMeters">
        </div>
      </div>
    </form>
  </div> <!-- Container -->
</template>

<style scoped>
.smallfont {
  font-size: 0.65rem;
}
</style>
