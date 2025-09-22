
import type { Plugin } from 'chart.js';
import { Chart } from 'chart.js'

interface VerticalLinePlugin extends Plugin<'line'> {
  mouseX: number | null;
  _draw(chart: Chart<'line'>, x: number): void;
}

function createVerticalLinePlugin() {


  // Plugin to draw vertical line at mouseX
  const verticalLinePlugin: VerticalLinePlugin = {

    id: 'verticalLinePlugin',

    mouseX: null,

    _draw(chart, x: number) {
      //console.log("x draw value", x)
      const ctx = chart.ctx;
      const topY = chart.chartArea.top;
      const bottomY = chart.chartArea.bottom;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      ctx.restore();

    },

    afterInit: (chart) => {

      const canvas = chart.canvas

      // Track mouse position relative to canvas
      canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        verticalLinePlugin.mouseX = event.clientX - rect.left;
        chart.draw(); // Trigger redraw. Clear the line
      });

      canvas.addEventListener('mouseleave', () => {
        verticalLinePlugin.mouseX = null;
        chart.draw(); // Clear the line

      });
    },

    afterDraw: (chart) => {
      const x = verticalLinePlugin.mouseX
      // do not draw line if:
      if (
        x === null ||
        // mouse out of chart boundary
        x < chart.chartArea.left ||
        x > chart.chartArea.right
      ) return;
      verticalLinePlugin._draw(chart, x)
    }
  };
  return verticalLinePlugin
}

export { createVerticalLinePlugin }
export type { VerticalLinePlugin }