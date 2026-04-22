# Implementation

This document describes the architecture, data flow, and source files of La Rampa.

## Data Flow

```
GPX/FIT file (user upload)
       |
       v
  File parsing (GPX via togeojson/xmldom, FIT via @garmin/fitsdk)
       |
       v
  GeoJSON FeatureCollection
       |
       v
  TrackData (internal model with lat/lon/elevation points)
       |
       v
  Akima spline interpolation (resample to equidistant 10 m points)
       |
       v
  TrackSegmentIndexed (indexed access with distance metadata)
       |
       v
  Sliding window climb detection (analyzeAscent)
       |
       v
  Visualization: Map + Elevation Chart + Table
```

## Application Structure

**App.vue** is the central orchestrator. It holds all reactive state and coordinates the child components:

```
App.vue
  ├── DropPanel / DropField — file upload (drag-and-drop + file picker)
  ├── MapView — OpenLayers map with track and climb overlay layers
  ├── ElevationChart — Chart.js elevation profile with zoom/pan
  └── Inline table — climb details (start, length, gain, gradient)
```

State flows top-down via props. Cross-component cursor synchronization uses a shared `CursorSync` instance created by `useCursorSync(points)` in App.vue and passed as a prop to both `MapView` and `ElevationChart`. Components call `cursor.setByDistance()` / `cursor.clear()` directly — no event bubbling needed.

The Pinia store (`trackStore.ts`) is defined but the app primarily uses local reactive state in App.vue.

### Cursor Sync Design

Three design principles govern the elevation sync module:

- **Resampling stays outside** the module — consumer's responsibility
- **Gradient colors fed from outside** via `segmentColors` prop
- **Sync is distance-based** (not index-based), so it works with any point spacing

## Source File Reference

### Entry Points

| File          | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `src/main.ts` | Application bootstrap — creates Vue app with Pinia, imports Bootstrap CSS    |
| `src/App.vue` | Root component — state management, data pipeline, parameter controls, layout |

### Components (`src/components/`)

| File                 | Description                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MapView.vue`        | OpenLayers map displaying the GPS track (blue line), detected climbs (red overlay), and a position marker. Accepts `cursor: CursorSync` and `points: TrackPoint[]`; wires map `pointermove`/`pointerout` to cursor sync internally |
| `ElevationChart.vue` | Chart.js elevation profile with zoom, pan, touch gestures, and climb interval highlighting. Accepts `cursor: CursorSync`; hover calls `cursor.setByDistance()` directly                                                            |
| `DropPanel.vue`      | File upload button wrapper                                                                                                                                                                                                         |
| `DropField.vue`      | Drag-and-drop file handler, emits `files-dropped` event                                                                                                                                                                            |

### Core Library (`src/lib/`)

> **Note on `TrackPoint` naming:** Two distinct types share this name. `TrackData.ts` exports `TrackPoint { lat, lon, elevation }` (raw GPS point). `elevationSync/types.ts` exports `TrackPoint { distance, elevation, lon, lat }` (resampled point with cumulative distance). Components and the cursor sync module use the elevationSync version.

| File                    | Description                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `TrackData.ts`          | Core data model. Types: `TrackPoint` (lat/lon/elevation), `TrackPointWithDistance` (adds distanceFromStart), `TrackSegment`, `TrackSegmentWithDistance`. `TrackData` manages multiple segments (`addSegment`, `addPointToSegment`, `getSegments`, `getAllPoints`). `TrackSegmentIndexed` wraps a fixed-distance segment with a virtual/internal index distinction (virtual = user-facing index starting from any offset; internal = zero-based array index), `slice`/`sliceSegment` for range extraction, and a `zoom(midpoint, factor)` function. |
| `analyzeAscent.ts`      | Climb detection algorithm — sliding window comparing elevation deltas against start/stop gradient thresholds          |
| `InterpolateSegment.ts` | Resamples a track to equidistant points using Akima spline interpolation (via `commons-math-interpolation`)           |
| `GeoJsonLoader.ts`      | Converts GeoJSON FeatureCollections into internal `TrackData` objects                                                 |
| `Gpx2Track.ts`          | Parses GPX XML into track data using `xpath` and `@xmldom/xmldom`                                                     |
| `Track2GeoJson.ts`      | Converts `TrackSegment` back to GeoJSON `LineString` features                                                         |
| `haversine.ts`          | Great-circle distance calculation between coordinates                                                                 |
| `AscentFillPlugin.ts`   | Chart.js plugin for rendering colored fills under climb sections                                                      |
| `typeHelpers.ts`        | TypeScript utility type definitions                                                                                   |

### Application Helpers (`src/lib/app/`)

| File                               | Description                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `gpx2GeoJson.ts`                   | Wrapper — converts a GPX string to a GeoJSON FeatureCollection                      |
| `extractFirstSegmentFirstTrack.ts` | Extracts the first segment from the first track in a `TrackData` array              |
| `transformHelpers.ts`              | `SegmentTransformManager` — manages zoom/pan viewport state for the elevation chart |

### Elevation Sync Module (`src/lib/elevationSync/`)

| File                  | Description                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`            | `TrackPoint` interface (distance, elevation, lon, lat) and `CursorSync` interface                                                                |
| `useCursorSync.ts`    | Composable — single source of truth for hover position; `distance` ref + `nearestIndex` computed (binary search) + `setByDistance()` / `clear()` |
| `cursorToInterval.ts` | Helper — maps `cursor.nearestIndex` to a 1-based interval ID by checking against index-based `slopeIntervals`                                    |
| `index.ts`            | Barrel export                                                                                                                                    |

### Elevation Chart Utilities (`src/lib/elevationChart/`)

| File                                | Description                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `ZoomState.ts`                      | Tracks zoom level and pan offset, enforces min/max bounds                  |
| `VerticalLinePlugin.ts`             | Chart.js plugin that draws a vertical cursor line at the mouse position    |
| `TransformPixelScale2ChartScale.ts` | Converts pixel coordinates to chart data coordinates for mouse interaction |
| `eventHandlers.ts`                  | Mouse wheel, drag, and touch event handlers for chart zoom and pan         |

### Map Utilities (`src/lib/mapView/`)

| File                    | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `TrackPointIndex.ts`    | KDBush spatial index for fast nearest-point queries on track coordinates      |
| `geoJson2MapFeature.ts` | Converts GeoJSON features to OpenLayers features with styling                 |
| `mapViewHelpers.ts`     | Utility functions for map layer creation                                      |
| `trackLayers.ts`        | Creates OpenLayers vector layers for the track (blue) and climb overlay (red) |
| `zoomToTrack.ts`        | Auto-zooms the map to fit the track bounds                                    |

### File Reader (`src/lib/fileReader/`)

| File                 | Description                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `readDroppedFile.ts` | Main entry point for file processing — detects file type (FIT or GPX), parses, and returns GeoJSON |

### Garmin FIT File Support (`src/lib/fileReader/fit/`)

| File              | Description                                                                           |
| ----------------- | ------------------------------------------------------------------------------------- |
| `FitFile.ts`      | Decoder wrapper using `@garmin/fitsdk` — validates and decodes binary FIT files       |
| `Messages.ts`     | `RecordMessageList` and `StartStopList` classes for structured access to FIT messages |
| `types.ts`        | TypeScript type definitions for FIT file structures                                   |
| `fitsdk.d.ts`     | TypeScript declarations for the Garmin FIT SDK                                        |
| `intersect.ts`    | Filters record messages to active recording intervals (between start/stop events)     |
| `joinSegments.ts` | Joins nearby track segments into a single continuous track                            |

### State (`src/stores/`)

| File            | Description                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `trackStore.ts` | Pinia store holding the current track segment (minimal usage — most state lives in App.vue) |

### Types (`src/types/`)

| File                 | Description                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `IntervalDetails.ts` | `IntervalDetail` interface — id, start/end index, start distance, interval length, elevation gain, average gradient |

### Tests (`src/__tests__/`)

| File                          | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `App.spec.ts`                 | App component smoke test                         |
| `TrackData.spec.ts`           | TrackData and TrackSegmentIndexed unit tests     |
| `Track2GeoJson.spec.ts`       | GeoJSON conversion tests                         |
| `TpIndex.spec.ts`             | TrackPointIndex spatial query tests              |
| `ZoomState.spec.ts`           | Zoom state calculation tests                     |
| `transformHelpers.spec.ts`    | Segment transformation tests                     |
| `detectEqualElements.spec.ts` | Array duplicate detection tests                  |
| `useCursorSync.spec.ts`       | CursorSync composable unit tests                 |
| `cursorToInterval.spec.ts`    | Interval mapping from cursor position tests      |
| `cursorSyncRendering.spec.ts` | Component rendering with cursor sync integration |

## Key Algorithms

### Climb Detection (`analyzeAscent.ts`)

A sliding window of configurable size (default: 500 m = 50 points at 10 m spacing) moves across the interpolated track. At each position, the elevation difference between the window's start and end points is computed.

- If the difference exceeds the **start threshold** (e.g., 5% gradient over the window = 25 m gain over 500 m), a climb begins at the lowest point in the window.
- If the difference drops below the **stop threshold** (e.g., 1% gradient = 5 m over 500 m), the climb ends at the highest point in the window.

The user controls three parameters via the UI: start gradient (%), stop gradient (%), and window size (m). These are converted to absolute elevation thresholds before calling the algorithm.

### Akima Spline Interpolation (`InterpolateSegment.ts`)

Raw GPS tracks have unevenly spaced points. The app resamples them to equidistant 10 m intervals using Akima cubic spline interpolation (via `commons-math-interpolation`). Three separate splines are created for latitude, longitude, and elevation as functions of cumulative distance. This produces smooth elevation curves and consistent spacing for the sliding window analysis.

### Spatial Indexing (`TrackPointIndex.ts`)

For interactive map features (hover/click to find nearest track point), the app builds a KDBush k-d tree index over all track coordinates. This enables O(log n) nearest-neighbor queries instead of scanning all points.
