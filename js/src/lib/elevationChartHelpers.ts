/** 
 * create a function which:
 * 
 * takes a segment from  Track object
 * calculates ascent ( y2-y1 ) / (x2-x1 ) for each point with a successor
 * 
 * 
*/
interface ElevationPoint {
  distance: number;
  elevation: number;
}

interface AreaProperties {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

/**
 * 
 * @param points dataset for line chart ( n )
 * @returns list of color strings ( n - 1 )
 */
function createAreaProperties(points: ElevationPoint[]): AreaProperties[] {
  // Helper to determine ascent color
  function getAscentColor(ascent: number) {
    return ascent < 0 ? 'rgba(55, 134, 55, 1)' : 'rgba(153, 15, 36, 1)'; // light green or light red
  }

  const areaList: AreaProperties[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const { distance: x1, elevation: y1 } = points[i];
    const { distance: x2, elevation: y2 } = points[i + 1];
    const ascent = (y2 - y1) / (x2 - x1);
    const color = getAscentColor(ascent)
    areaList.push(
      { x1, y1, x2, y2, color }
    )
  }


  // Return chart options instead of creating chart
  return areaList
}

export type { ElevationPoint, AreaProperties }
export { createAreaProperties }

