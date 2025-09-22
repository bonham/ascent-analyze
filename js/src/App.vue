<script setup lang="ts">
import MapView from '@/components/MapView.vue';
import ElevationChart from '@/components/ElevationChart.vue';
import { ref, onMounted, computed } from 'vue';
import { GeoJsonLoader } from '@/lib/GeoJsonLoader';
import { TrackSegmentIndexed } from '@/lib/TrackData'
import type { TrackData, TrackSegment } from '@/lib/TrackData'
import { makeEquidistantTrackAkima } from '@/lib/InterpolateSegment';
import type { FeatureCollection, Feature, LineString, MultiLineString } from 'geojson';
import { Track2GeoJson } from '@/lib/Track2GeoJson';
import { ZoomEventQueue, ZoomManager } from '@/lib/appHelpers';
import DropField from '@/components/DropField.vue';
import DropPanel from '@/components/DropPanel.vue';
import { analyzeAscent } from '@/lib/analyzeAscent'
import { Gpx2Track } from './lib/Gpx2Track';

const START_TRIGGER_DELTA = 25
const STOP_TRIGGER_DELTA = 5
const POINT_DISTANCE = 100; // Distance in meters for equidistant points
//const ZOOMWINDOW = 31 // in index numbers

const lineStringFeature = ref<Feature<LineString> | null>(null)
const elevationChartSegment = ref<TrackSegmentIndexed | null>(null)
const elevationChartMouseXValue = ref<number | null>(null);
const mapViewMouseIndexValue = ref<number | null>(null);
const zoomMapOnUpdate = ref(false)
const slopeIntervals = ref<[number, number][]>([])
const startThreshold = ref(START_TRIGGER_DELTA)
const stopThreshold = ref(STOP_TRIGGER_DELTA)

// computed getters
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
  let geojson: FeatureCollection<LineString>;
  try {
    geojson = await loadGeoJson()
    const { segmentIndexed: initialSegmentIndexed, overlayIntervals } = extractAfterLoad(geojson)
    refreshPage(initialSegmentIndexed, overlayIntervals)
  } catch (e) {
    console.error('Failed to load track data:', e);
    return
  }

})

// Load a geojson file
async function loadGeoJson(): Promise<FeatureCollection<LineString>> {
  const response = await fetch('/kl.json');
  const geojson = await response.json();
  return geojson
}

function extractAfterLoad(featureCollection: FeatureCollection<LineString>) {
  // Convert from geojson to list of track objects
  const tracks = GeoJsonLoader.loadFromGeoJson(featureCollection);

  // Only first segment is taken into account
  const segment = extractFirstSegmentFirstTrack(tracks)


  // interpolate
  const segmentEquidistant = makeEquidistantTrackAkima(segment, POINT_DISTANCE)
  const segmentIndexed = new TrackSegmentIndexed(segmentEquidistant, POINT_DISTANCE)
  const overlayIntervals = analyzeAscent(segmentIndexed.getSegment())
  return { segmentIndexed, overlayIntervals }
}

function refreshPage(segmentIndexed: TrackSegmentIndexed, overlayIntervals: [number, number][]) {
  const zoomManager = new ZoomManager(segmentIndexed)
  zoomQueue = new ZoomEventQueue((centerIndex, factor) => {
    const newSegment = zoomManager.applyFactorInternal(centerIndex, factor)
    zoomMapOnUpdate.value = false
    updateElevationChart(newSegment, overlayIntervals)
  })

  // initial update with zoom
  zoomMapOnUpdate.value = true
  updateMap(segmentIndexed)
  updateElevationChart(segmentIndexed, overlayIntervals)
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

async function processUploadFiles(files: FileList) {
  const featureCollection = await readDroppedFile(files)
  const { segmentIndexed: initialSegmentIndexed, overlayIntervals } = extractAfterLoad(featureCollection)
  refreshPage(initialSegmentIndexed, overlayIntervals)
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

function gpx2GeoJson(input: string): FeatureCollection<LineString> {
  const g2t = new Gpx2Track(input)
  console.log("Num Traks:", g2t.numTracks())
  const fl = g2t.getTrackFeatures()
  console.log("FL:", fl[0])
  // console.log("FL:", JSON.stringify(fl, undefined, 2))

  const firstFeature = fl[0]

  function isLineStringFeature(obj: unknown): obj is Feature<LineString> {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      obj &&
      'type' in obj &&
      obj.type === 'Feature' &&
      'geometry' in obj &&
      typeof obj.geometry === 'object' &&
      obj.geometry !== null &&
      'type' in obj.geometry &&
      obj.geometry.type === 'LineString'
    );
  }

  // Example usage:
  if (!isLineStringFeature(firstFeature)) {
    throw new Error('Uploaded file does not contain a valid LineString Feature');
  }
  const featureCollection: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features: [
      firstFeature
    ]
  }
  return featureCollection
}

</script>

<template>
  <div class="container py-4 px-3 mx-auto">
    <h1>You did it!</h1>
    <form class="row row-cols-lg-auto g-3 align-items-center">
      <div class="col-12">
        <div class="input-group">
          <div class="input-group-text">Slope start threshold</div>
          <input type="text" class="form-control" v-model="startThreshold">
        </div>
      </div>
      <div class="col-12">
        <div class="input-group">
          <div class="input-group-text">Slope stop threshold</div>
          <input type="text" class="form-control" v-model="stopThreshold">
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
