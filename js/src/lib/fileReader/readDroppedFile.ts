import { gpx2GeoJson } from '@/lib/app/gpx2GeoJson';
import type { FeatureCollection, LineString } from 'geojson';
import { FitFile } from '@/lib/fileReader/fit/FitFile';
import { Buffer } from 'buffer';
import { Track2GeoJson } from '../Track2GeoJson';
import type { TrackSegment } from '../TrackData';

// Read dropped file, return promise with GeoJSON FeatureCollection
// Only first track in file is considered
// Rejects if no valid track found
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
        if (fr.result !== null && fr.result instanceof ArrayBuffer) {
          console.log("ArrayBuffer read, try to decode as fit file")

          const buf = Buffer.from(fr.result)
          if (FitFile.isFit(buf)) {
            console.log("File is fit file")
            const fitFile = new FitFile(buf)
            const segments = fitFile.getRecordMessageList(+Infinity) // join all segments to one
            if (segments.length < 1) {
              reject(new Error("No segments found in fit file"))
              return
            }
            const onlySegment = segments[0]
            const trackData: TrackSegment = []
            onlySegment.getMessages().forEach((recordMessage) => {
              const [lat, lon] = recordMessage.getLatLon()
              const fitMsg = recordMessage.getFitMessage()
              const elevation = fitMsg.altitude
              if (elevation === undefined) throw Error("Elevation not defined")
              trackData.push({ lat, lon, elevation })
            })
            const t2g = new Track2GeoJson(trackData)
            const feature = t2g.toGeoJsonLineStringFeature()
            const featureCollection: FeatureCollection<LineString> = {
              type: "FeatureCollection",
              features: [feature]
            }
            resolve(featureCollection)
          } else {
            // read as gpx
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(fr.result);
            const featureCollection = gpx2GeoJson(text);
            resolve(featureCollection);
          }
        } else {
          reject(new Error("FileReader result is null or not ArrayBuffer"))
        }
      })
      fr.readAsArrayBuffer(thisFile) // async

      //      fr.readAsText(thisFile) // async
    }

  })

  return prom

}
export { readDroppedFile }