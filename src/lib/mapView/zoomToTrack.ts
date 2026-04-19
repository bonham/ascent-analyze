import { isEmpty } from 'ol/extent';
import VectorSource from 'ol/source/Vector';
import type { Geometry as OlGeometry } from 'ol/geom';
import OlFeature from 'ol/Feature';
import Map from 'ol/Map';

export function zoomToTrack(map: Map, source: VectorSource<OlFeature<OlGeometry>>,) {
  const extent = source.getExtent();
  if (!isEmpty(extent)) {
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: 17,
      duration: 1000
    });
    map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 800 });
  }
}
