# Refactoring Plan: Reusable Elevation Sync Module

## Context

The current `App.vue` uses three separate reactive variables (`elevationChartMouseXValue`, `mapViewMouseIndexValue`, `tableHighlightXValue`) coordinated by imperative event wiring in the template. The goal is to extract a clean, reusable layered module so that cursor sync between map, elevation chart, and table can be consumed independently with a well-defined API.

Prior design decisions:

- Resampling stays **outside** the module (consumer's responsibility)
- Gradient colors fed from **outside** (via `segmentColors` prop)
- Sync is **distance-based** (not index-based), so it works with any point spacing

---

## Proposed API

### Shared type: `TrackPoint`

```typescript
// src/lib/elevationSync/types.ts
export interface TrackPoint {
  distance: number // cumulative distance in meters
  elevation: number
  lon: number
  lat: number
}
```

---

### 1. `useCursorSync(points)` — shared cursor state

```typescript
// src/lib/elevationSync/useCursorSync.ts

export interface CursorSync {
  distance: Readonly<Ref<number | null>>
  nearestIndex: Readonly<ComputedRef<number | null>> // binary search: distance → index
  setByDistance(d: number): void
  clear(): void
}

export function useCursorSync(points: MaybeRef<TrackPoint[]>): CursorSync
```

- `distance` — single source of truth (meters along track)
- `nearestIndex` — derived via binary search; used internally by chart + map, exposed for table
- `setByDistance(d)` — called by chart on hover, by map on pointermove
- `clear()` — called on mouseleave

Consumer creates **one instance** and passes it to all consumers.

---

### 2. `ElevationChart` component — chart with built-in cursor integration

```typescript
// src/components/ElevationChart.vue (modified)

interface Props {
  points: TrackPoint[] // { distance, elevation, lon, lat }[]
  cursor: CursorSync // shared cursor instance from useCursorSync
  segmentColors?: string[] | null // length = points.length - 1; null = no fill
}
// No events emitted — chart calls cursor.setByDistance() directly on hover
```

- Chart hover → `cursor.setByDistance(d)` where `d` = Chart.js x-value at hover pixel
- `watch(cursor.distance)` → update `VerticalLinePlugin` pixel position

---

### 3. `useMapTrackCursor(map, points, cursor)` — wires OL map to cursor

```typescript
// src/lib/mapView/useMapTrackCursor.ts

export function useMapTrackCursor(
  map: Map, // OpenLayers Map instance
  points: MaybeRef<TrackPoint[]>,
  cursor: CursorSync,
): void
```

- Registers `map.on('pointermove')` → KD-tree nearest point → `cursor.setByDistance(point.distance)`
- Registers `map.on('pointerout')` → `cursor.clear()`
- `watch(cursor.nearestIndex)` → `MarkerOnTrack.setByIndex(i)` (or clear)

Called **inside `MapView.vue`** — MapView accepts `cursor` as a prop instead of `highlightXpos`/`@hoverIndex`.

---

### 4. `cursorToInterval(cursor, intervals)` — table helper

```typescript
// src/lib/elevationSync/cursorToInterval.ts

export function cursorToInterval(
  cursor: CursorSync,
  intervals: MaybeRef<[number, number][]>, // index-based [startIdx, endIdx][]
): ComputedRef<number | null> // 1-based interval ID, or null
```

`cursor.nearestIndex` is checked against index-based `slopeIntervals` — no change to existing interval data needed.

---

## Component interface changes

| Component        | Before                                                                                                 | After                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `ElevationChart` | props: `elevationData`, `cursorIndex`, `overlayIntervals`, `pointDistance` / emits: `highlight-xvalue` | props: `points: TrackPoint[]`, `cursor: CursorSync`, `segmentColors?`            |
| `MapView`        | props: `highlightXpos`, `lineStringF`, `overlayLineStringF`, `zoomOnUpdate` / emits: `hoverIndex`      | props: `cursor: CursorSync`, `lineStringF`, `overlayLineStringF`, `zoomOnUpdate` |
| `App.vue`        | 3 cursor refs + template wiring                                                                        | `const cursor = useCursorSync(points)` passed to both                            |

---

## File structure

```
src/lib/elevationSync/           # new
  types.ts                       # TrackPoint, CursorSync
  useCursorSync.ts               # cursor composable
  cursorToInterval.ts            # table helper
  index.ts                       # barrel export

src/lib/elevationChart/          # existing
  ElevationChart.vue             # modified: new props, uses cursor
  AscentFillPlugin.ts            # slim down: accepts colorsRef, removes internal calcColors
  gradientColors.ts              # new: computeGradientColors utility
  VerticalLinePlugin.ts          # unchanged
  eventHandlers.ts               # unchanged (zoom/pan)

src/lib/mapView/                 # existing
  useMapTrackCursor.ts           # new: wires OL map to CursorSync
  TrackPointIndex.ts             # unchanged (KD-tree)
  mapViewHelpers.ts              # unchanged (MarkerOnTrack)

src/components/
  MapView.vue                    # modified: accepts cursor prop, calls useMapTrackCursor
```

---

## Companion utilities (exported alongside module)

| Utility                                   | File                             | Purpose                                                 |
| ----------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| `makeEquidistantTrackAkima`               | existing `InterpolateSegment.ts` | Resampling — not part of module, re-exported            |
| `computeGradientColors(points, colorFn?)` | `gradientColors.ts`              | Color per segment from gradient %, no resampling needed |

---

## Verification

1. `npm run dev` — app renders, red dot syncs on all three consumers
2. Hover chart → dot moves on map + table row highlights
3. Hover map → vertical line moves on chart + table row highlights
4. Mouse leaves either component → cursor clears everywhere
5. `npm run build` — no type errors
6. `npm test` — all tests pass
