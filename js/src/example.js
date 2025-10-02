let accumulatedDelta = 0;
let zoomInProgress = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleWheel(e) {
  e.preventDefault();
  accumulatedDelta += e.deltaY;

  // Schedule a frame if not already zooming
  if (!zoomInProgress) {
    requestAnimationFrame(processZoom);
  }
}

async function processZoom() {
  if (accumulatedDelta === 0 || zoomInProgress) return;

  zoomInProgress = true;

  const delta = accumulatedDelta;
  accumulatedDelta = 0;

  const zoomFactor = Math.exp(-delta * 0.001); // tweak sensitivity
  await chart.zoomX(zoomFactor); // wait for animation to finish

  zoomInProgress = false;

  // If more scroll happened during zoom, schedule another frame
  if (accumulatedDelta !== 0) {
    requestAnimationFrame(processZoom);
  }
}
