
import type { Plugin } from 'chart.js';

function createVerticalLinePlugin() {

  let mouseX: number | null = null;

  // Plugin to draw vertical line at mouseX
  const verticalLinePlugin: Plugin<'line'> = {

    id: 'verticalLine',
    afterInit: (chart) => {

      const canvas = chart.canvas

      // Track mouse position relative to canvas
      canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        chart.draw(); // Trigger redraw

      });

      canvas.addEventListener('mouseleave', () => {
        mouseX = null;
        chart.draw(); // Clear the line

      });
    },

    afterDraw: (chart) => {
      if (mouseX === null) return;

      const ctx = chart.ctx;
      const topY = chart.chartArea.top;
      const bottomY = chart.chartArea.bottom;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(mouseX, topY);
      ctx.lineTo(mouseX, bottomY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      ctx.restore();
    }
  };
  return verticalLinePlugin
}

export { createVerticalLinePlugin }