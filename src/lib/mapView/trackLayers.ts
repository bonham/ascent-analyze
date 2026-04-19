import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import { Vector as VectorLayer } from 'ol/layer';

function getMapElements() {
  /* **** Base Track **** */
  const trackStyle = new Style({
    stroke: new Stroke({
      color: '#37a3eb',       // Or any CSS color
      width: 4             // Adjust thickness here
    })
  });

  const baseTrackVectorSource = new VectorSource()
  const baseTrackVectorLayer = new VectorLayer({
    source: baseTrackVectorSource,
    style: trackStyle      // Apply the custom style
  });

  /* **** Overlay Track for slopes **** */
  const overlayStyle = new Style({
    stroke: new Stroke({
      color: '#dc3912',       // Or any CSS color
      width: 3            // Adjust thickness here
    })
  });

  const overlayVectorSource = new VectorSource()
  const overlayVectorLayer = new VectorLayer({
    source: overlayVectorSource,
    style: overlayStyle      // Apply the custom style
  });

  /* **** Marker on Track **** */
  const markerSource = new VectorSource();
  const markerLayer = new VectorLayer({
    source: markerSource,
    style: new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: 'red' }) // Customize your highlight color here
      })
    })
  });
  return {
    baseTrackVectorSource,
    baseTrackVectorLayer,
    overlayVectorSource,
    overlayVectorLayer,
    markerSource,
    markerLayer
  }
}

export { getMapElements }