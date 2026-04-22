import { computed, unref } from 'vue'
import type { MaybeRef, ComputedRef } from 'vue'
import type { CursorSync } from './types'

/**
 * Maps the cursor's nearestIndex to a 1-based interval ID, or null when the cursor
 * is not inside any of the given intervals.
 *
 * @param cursor  Shared CursorSync instance.
 * @param intervals Index-based intervals [startIdx, endIdx][] as produced by analyzeAscent.
 * @returns ComputedRef<number | null> — 1-based interval ID, or null.
 */
export function cursorToInterval(
  cursor: CursorSync,
  intervals: MaybeRef<[number, number][]>,
): ComputedRef<number | null> {
  return computed<number | null>(() => {
    const idx = cursor.nearestIndex.value
    if (idx === null) return null

    const ivs = unref(intervals)
    const found = ivs.findIndex(([start, end]) => idx >= start && idx <= end)
    return found >= 0 ? found + 1 : null  // 1-based ID
  })
}
