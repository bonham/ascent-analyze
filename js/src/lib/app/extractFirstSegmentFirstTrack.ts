// extract first segment from first track
import type { TrackData, TrackSegment } from '@/lib/TrackData'
export function extractFirstSegmentFirstTrack(tracks: TrackData[]): TrackSegment {
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

