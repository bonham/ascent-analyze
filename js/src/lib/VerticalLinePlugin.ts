
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

      canvas.addEventListener('mouseenter', (event) => { // pointermove did not work on iphone
        chart.render(); // to clear any existing line
        const rect = canvas.getBoundingClientRect();
        verticalLinePlugin.mouseX = event.clientX - rect.left;
      });

      canvas.addEventListener('touchstart', (event) => {
        chart.render(); // to clear any existing line
        const rect = canvas.getBoundingClientRect();
        if (event.touches.length === 0) return;
        if (event.touches.length > 1) return; // only single touch
        const client = event.touches[0];
        verticalLinePlugin.mouseX = client.clientX - rect.left;
        //chart.draw(); // Trigger redraw. Clear the line
      });

      // Track mouse position relative to canvas
      canvas.addEventListener('mousemove', (event) => { // pointermove did not work on iphone
        const rect = canvas.getBoundingClientRect();
        verticalLinePlugin.mouseX = event.clientX - rect.left;
      });

      canvas.addEventListener('touchmove', (event) => {
        const rect = canvas.getBoundingClientRect();
        if (event.touches.length === 0) return;
        if (event.touches.length > 1) return; // only single touch
        const client = event.touches[0];
        verticalLinePlugin.mouseX = client.clientX - rect.left;
      });


      canvas.addEventListener('mouseleave', () => {
        //        verticalLinePlugin.mouseX = null;
        //chart.draw(); // Clear the line
      });
      canvas.addEventListener('touchend', () => {
        //  verticalLinePlugin.mouseX = null;
        //chart.draw(); // Clear the line
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