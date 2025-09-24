<script setup lang="ts">
import MapView from '@/components/MapView.vue';
import ElevationChart from '@/components/ElevationChart.vue';
import { ref, onMounted, computed } from 'vue';
import { GeoJsonLoader } from '@/lib/GeoJsonLoader';
import { TrackSegmentIndexed } from '@/lib/TrackData'
import { makeEquidistantTrackAkima } from '@/lib/InterpolateSegment';
import type { FeatureCollection, Feature, LineString, MultiLineString } from 'geojson';
import { ZoomEventQueue, ZoomManager } from '@/lib/appHelpers';
import DropField from '@/components/DropField.vue';
import DropPanel from '@/components/DropPanel.vue';
import { analyzeAscent } from '@/lib/analyzeAscent'
import { gpx2GeoJson } from '@/lib/app/gpx2GeoJson';
import { extractFirstSegmentFirstTrack } from '@/lib/app/extractFirstSegmentFirstTrack';
import { Track2GeoJson } from '@/lib/Track2GeoJson';


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


// Interpolated full segment after initial load
let zoomQueue: ZoomEventQueue

onMounted(async () => {

  // loading the data should be done after mounted and all child components are ready ( chart, map )

  // Load the track data when the component is mounted
  try {
    featureCollection.value = await loadGeoJson()
    zoomMapOnUpdate.value = true
    elevationChartSegment.value = trackSegmentIndexed.value

  } catch (e) {
    console.error('Failed to load track data:', e);
    return
  }

  zoomQueue = new ZoomEventQueue((centerIndex, factor) => {
    const newSegment = zoomManager.value.applyFactorInternal(centerIndex, factor)
    zoomMapOnUpdate.value = false
    updateElevationChart(newSegment)
  })


})

// Load a geojson file
async function loadGeoJson(): Promise<FeatureCollection<LineString>> {
  const response = await fetch('./kl.json');
  const geojson = await response.json();
  return geojson
}


/**
 * Updates Elevation Chart
 * @param newTrack New indexed track to use for updating 
 */
function updateElevationChart(newTrack: TrackSegmentIndexed) {
  elevationChartSegment.value = newTrack
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

async function processUploadFiles(files: FileList) {
  zoomMapOnUpdate.value = true
  featureCollection.value = await readDroppedFile(files)
  elevationChartSegment.value = trackSegmentIndexed.value
}

function readDroppedFile(files: FileList): Promise<FeatureCollection<LineString>> {

  const prom: Promise<FeatureCollection<LineString>> = new Promise((resolve, reject) => {

    if (files.length < 1) {
      reject(new Error("Filelist is empty"))
    }

    // take only first file from input
    const thisFile = files[0]
    if (thisFile === null) {
      reject(new Error("File is null"))
    } else {

      const fr = new FileReader()
      fr.addEventListener('load', () => {
        if (fr.result !== null && typeof fr.result === 'string') {
          const featureCollection = gpx2GeoJson(fr.result)
          resolve(featureCollection)
        }
      })
      fr.readAsText(thisFile) // async
    }

  })

  return prom

}



</script>

<template>
  <div class="container py-4 px-3 mx-auto">
    <h1>You did it!</h1>
    <form class="row row-cols-lg-auto g-3 align-items-center">
      <div class="col-12">
        <div class="input-group">
          <div class="input-group-text">Slope start gradient</div>
          <input type="text" class="form-control" v-model="startGradient">
        </div>
      </div>
      <div class="col-12">
        <div class="input-group">
          <div class="input-group-text">Slope stop gradient</div>
          <input type="text" class="form-control" v-model="stopGradient">
        </div>
      </div>
      <div class="col-12">
        <div class="input-group">
          <div class="input-group-text">Window Size</div>
          <input type="text" class="form-control" v-model="windowSizeMeters">
        </div>
      </div>
    </form>
    <DropField @files-dropped="processUploadFiles">
      <div class="row my-3 py-3 border">
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
  </div>
  <DropPanel @files-dropped="processUploadFiles" />
</template>

<style scoped></style>
