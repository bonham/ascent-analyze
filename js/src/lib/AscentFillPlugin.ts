import { hasProperty } from './typeHelpers';
import type { Plugin } from 'chart.js';

interface IndexedPoint {
  index: number,
  y: number
}

interface XYPoint {
  x: number,
  y: number
}

// Function for ascentFillPlugin ( customizable )
// To make it more universal: this function could be implemented as callback value in plugin options
function calcColors(points: XYPoint[]): string[] {
  const colorList: string[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const { x: x1, y: y1 } = p1;

    const p2 = points[i + 1];
    const { x: x2, y: y2 } = p2;

    const ascent = (y2 - y1) / (x2 - x1);

    const color = ascent < 0 ? 'rgba(55, 134, 55, 1)' : 'rgba(153, 15, 36, 1)'; //  green or  red
    colorList.push(color)
  }
  return colorList
}

// ---- ascentFillPlugin
function createAscentFillPlugin(pointDistance: number) {
  const ascentFillPlugin: Plugin<'line'> = {
    id: 'ascentFillPlugin',

    beforeDatasetDraw(chart) {
      const { ctx, chartArea: { bottom } } = chart;

      const dataSets = chart.config.data.datasets
      if (dataSets.length === 0) return

      const yScale = chart.scales.y;
      const xScale = chart.scales.x;
      if (xScale.type !== 'category') {
        console.log(`Need x-axis scale type 'category', not ${xScale.type}`)
        return
      }

      const meta = chart.getDatasetMeta(0)
      if (meta.type !== 'line') return; // Only apply to line charts

      // returns { index: number, y: number }[] - index is not really useful as it should be 0, 1, 2 ... etc ... ( same as array index )
      const parsedData: IndexedPoint[] = [] // meta.data.map(element => element.$context.parsed) as { x: number; y: number }[]; // not good, needs checking

      // check each element for correct type and create list of points
      meta.data.forEach((element, idx) => {
        const u = element as unknown
        if (!hasProperty(u, '$context')) {
          console.log(`Element with index ${idx} does not have $context property`)
          return
        }
        const ctxt = u.$context
        if (!hasProperty(ctxt, 'parsed')) {
          console.log(`Element context with index ${idx} does not have parsed property`)
          return
        }
        const dataPoint = ctxt.parsed
        if (hasProperty(dataPoint, 'x') && hasProperty(dataPoint, 'y')) {
          // hacky at the end
          parsedData.push({ index: Number(dataPoint.x), y: Number(dataPoint.y) })
        }
      })

      // Translate to our distance in x . Will create a list of [ x, y ]
      const myPoints: XYPoint[] = parsedData.map((_, i) => ({ x: i * pointDistance, y: _.y }))

      ctx.save();

      const colors = calcColors(myPoints)
      colors.forEach((color, index) => {

        const x1 = xScale.getPixelForValue(parsedData[index].index);
        const y1 = yScale.getPixelForValue(parsedData[index].y);
        const x2 = xScale.getPixelForValue(parsedData[index + 1].index);
        const y2 = yScale.getPixelForValue(parsedData[index + 1].y);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, bottom);
        ctx.lineTo(x1, bottom);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();

    }
  };
  return ascentFillPlugin
}

export { createAscentFillPlugin }
