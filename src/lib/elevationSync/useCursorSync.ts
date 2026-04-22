import { ref, computed, readonly, unref } from 'vue'
import type { MaybeRef, ComputedRef } from 'vue'
import type { TrackPoint, CursorSync } from './types'

/**
 * Binary search: find the index of the point whose distance is closest to `distance`.
 * Ties (equidistant neighbours) resolve to the lower index.
 */
function findNearestIndex(points: TrackPoint[], distance: number): number | null {
  if (points.length === 0) return null

  let lo = 0
  let hi = points.length - 1

  // Find first index where points[lo].distance >= distance
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid]!.distance < distance) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }

  // lo is now the first index where points[lo].distance >= distance.
  // Compare with the predecessor to pick the closer one (lower index on ties).
  if (lo > 0 && (distance - points[lo - 1]!.distance) <= (points[lo]!.distance - distance)) {
    return lo - 1
  }
  return lo
}

/**
 * Composable that holds a single shared cursor position (distance along the track).
 *
 * Create one instance and pass it to all consumers (ElevationChart, MapView, table helper).
 * The instance is the single source of truth; all consumers react to the same reactive state.
 *
 * @param points TrackPoint array (or a ref/computed wrapping one). Must be sorted by distance.
 */
export function useCursorSync(points: MaybeRef<TrackPoint[]>): CursorSync {
  const _distance = ref<number | null>(null)

  const nearestIndex = computed<number | null>(() => {
    if (_distance.value === null) return null
    return findNearestIndex(unref(points), _distance.value)
  })

  return {
    distance: readonly(_distance),
    nearestIndex: readonly(nearestIndex) as Readonly<ComputedRef<number | null>>,
    setByDistance(d: number) {
      _distance.value = d
    },
    clear() {
      _distance.value = null
    },
  }
}
