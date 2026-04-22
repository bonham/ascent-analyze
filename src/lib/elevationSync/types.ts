import type { Ref, ComputedRef } from 'vue'

export interface TrackPoint {
  distance: number   // cumulative distance from track start in meters
  elevation: number  // meters
  lon: number        // EPSG:4326
  lat: number        // EPSG:4326
}

export interface CursorSync {
  /** Current cursor position in meters along the track. Readonly — mutate via setByDistance/clear. */
  distance: Readonly<Ref<number | null>>
  /** Index of the nearest point in the points array for the current distance. */
  nearestIndex: Readonly<ComputedRef<number | null>>
  /** Set cursor to the given cumulative distance in meters. */
  setByDistance(d: number): void
  /** Clear the cursor (sets distance to null). */
  clear(): void
}
