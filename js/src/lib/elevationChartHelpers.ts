/** 
 * create a function which:
 * 
 * takes a segment from  Track object
 * calculates ascent ( y2-y1 ) / (x2-x1 ) for each point with a successor
 * create a chart.js chart with datasets:
 * each dataset has two data points ( i and i+1 ).
 * each dataset has these options:
 *      fill: {
                target: 'origin',
                above: ascentColor,  
              },
        borderColor: 'rgb(75, 192, 192)'

 * ascentColor should be light green if ascent is < 0 and light red if ascent >= 0
 * legend should have display: false
 * 
 * 
 * 
*/

import type { ChartDataset } from 'chart.js';

interface ElevationPoint {
  distance: number;
  elevation: number;
}

// This function returns a Chart.js configuration object for a line chart.
// The generic arguments in ChartConfiguration<'line', { x: number; y: number }[], unknown> are:
// 1. 'line' - the chart type.
// 2. { x: number; y: number }[] - the type of data points for each dataset.
// 3. unknown - the type for chart plugins/options (usually left as unknown).

export function createAscentDataset(points: ElevationPoint[]): ChartDataset<'line', { x: number; y: number }[]>[] {
  // Helper to determine ascent color
  function getAscentColor(ascent: number) {
    return ascent < 0 ? 'rgba(55, 134, 55, 1)' : 'rgba(153, 15, 36, 1)'; // light green or light red
  }

  // Prepare datasets
  const datasets: ChartDataset<'line', { x: number; y: number }[]>[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const { distance: x1, elevation: y1 } = points[i];
    const { distance: x2, elevation: y2 } = points[i + 1];
    const ascent = (y2 - y1) / (x2 - x1);

    datasets.push({
      //      label: `Segment ${i}`,
      data: [
        { x: x1, y: y1 },
        { x: x2, y: y2 }
      ],
      fill: {
        target: 'origin',
        above: getAscentColor(ascent)
      },
      borderColor: 'rgb(75, 192, 192)'
    });
  }


  // Return chart options instead of creating chart
  return datasets
}

export type { ElevationPoint }

