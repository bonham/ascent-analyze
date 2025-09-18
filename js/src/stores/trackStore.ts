import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { TrackSegmentWithDistance } from '@/lib/TrackData'

export const useTrackStore = defineStore('track', () => {
  const segment = ref<TrackSegmentWithDistance>([])

  return { segment }
})
