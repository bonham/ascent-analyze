# La Rampa — Cycling Climb Analyzer

La Rampa is a web application for cyclists who want to analyze the climbs in their recorded routes. Load a GPX or Garmin FIT file, and the app will automatically detect climbs based on configurable gradient thresholds — then visualize them on an interactive map, an elevation profile chart, and a summary table.

## Features

- **GPX and Garmin FIT file support** — drag-and-drop or file picker
- **Interactive map** — track and detected climbs displayed on OpenStreetMap (via OpenLayers)
- **Elevation profile chart** — zoomable and pannable distance/elevation diagram with climb highlighting
- **Climb summary table** — start position, length, elevation gain, and average gradient for each detected climb
- **Configurable detection** — adjust start gradient, stop gradient, and sliding window size to tune climb sensitivity
- **Cross-linked highlighting** — hover over the chart, map, or table to highlight the corresponding position in all views

## How Climb Detection Works

The app uses a sliding window algorithm to find sustained climbs in the elevation profile:

1. The GPS track is first resampled to equidistant points (10 m spacing) using Akima spline interpolation, which smooths out GPS noise while preserving the true elevation profile.

2. A sliding window moves along the track. The window size (default: 500 m) defines the distance over which gradient is measured.

3. **Start trigger**: When the elevation gain within the window reaches the start gradient threshold (default: 5%), a climb begins. The start point is set to the lowest elevation within the window.

4. **Stop trigger**: When the elevation gain within the window drops below the stop gradient threshold (default: 1%), the climb ends. The end point is set to the highest elevation within the window.

This approach detects climbs that are sustained over a meaningful distance, filtering out short bumps and GPS noise.

## Getting Started

**Prerequisites:** Node.js 20.19+ or 22.12+

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type-check and build for production
npm run build
```

The production build is output to `dist/` with base path `/larampa/`.

## Tech Stack

- [Vue 3](https://vuejs.org/) with Composition API and TypeScript
- [Vite](https://vitejs.dev/) for build tooling
- [OpenLayers](https://openlayers.org/) for map rendering
- [Chart.js](https://www.chartjs.org/) for the elevation profile
- [Pinia](https://pinia.vuejs.org/) for state management
- [@garmin/fitsdk](https://www.npmjs.com/package/@garmin/fitsdk) for Garmin FIT file parsing
- [@tmcw/togeojson](https://www.npmjs.com/package/@tmcw/togeojson) for GPX parsing
- [Bootstrap 5](https://getbootstrap.com/) for UI styling

## Architecture

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for a detailed description of the application architecture, data flow, and source file reference.
