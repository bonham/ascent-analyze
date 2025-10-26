import { type DataInterval } from "./ZoomState";

export class TransformPixelScale2ChartScale {

  MIN_INTERVAL_LENGTH = 20

  pixelChartScalePoints: {
    p0: number,
    x0: number,
    p1: number,
    x1: number,
  }

  pixelStartInterval: number[]
  chartStartInterval: number[]
  pixelPinchedInterval: number[] // zoom and pan result in pixel space

  scaleFactor: number
  pixelPanDelta: number
  chartpanDelta: number
  zoomFactor: number
  chartPincedMid: number

  constructor() {
    this.pixelChartScalePoints = { p0: 0, x0: 0, p1: 0, x1: 0 }
    this.pixelStartInterval = [0, 0]
    this.chartStartInterval = [0, 0]
    this.pixelPinchedInterval = [0, 0]

    this.scaleFactor = 0
    this.pixelPanDelta = 0
    this.chartpanDelta = 0
    this.zoomFactor = 0
    this.chartPincedMid = 0
  }

  setPoints(p0: number, x0: number, p1: number, x1: number) {
    this.pixelChartScalePoints = { p0, x0, p1, x1 }
  }

  setChartStartInterval(startInterval: DataInterval) {
    this.chartStartInterval = [startInterval.start, startInterval.end]
  }

  setPixelStartInterval(startInterval: DataInterval) {
    this.pixelStartInterval = [startInterval.start, startInterval.end]
  }

  setPixelPinchedInterval(pinchedInterval: DataInterval) {
    this.pixelPinchedInterval = [pinchedInterval.start, pinchedInterval.end]
  }

  getChartPinchedInterval(): DataInterval {

    // Calculate chart interval after zoom and pan in pixel space

    const scaleFactor = this.pix2ChartScaleFactor()
    this.scaleFactor = scaleFactor
    const midPixelStart = intervalMidPoint(this.pixelStartInterval)
    const midPixelPinched = intervalMidPoint(this.pixelPinchedInterval)
    const pixelPanDelta = midPixelPinched - midPixelStart
    this.pixelPanDelta = pixelPanDelta
    const pixelStartLength = this.pixelStartInterval[1] - this.pixelStartInterval[0]
    const pixelPinchedLength = this.pixelPinchedInterval[1] - this.pixelPinchedInterval[0]
    let zoomFactor = pixelStartLength / pixelPinchedLength
    const chartStartLength = this.chartStartInterval[1] - this.chartStartInterval[0]

    // Zoom
    if (zoomFactor < 1) {
      const minFactorLimit = this.MIN_INTERVAL_LENGTH / chartStartLength
      zoomFactor = Math.max(minFactorLimit, zoomFactor)
    }
    this.zoomFactor = zoomFactor
    const chartPinchedLength = chartStartLength * zoomFactor

    // Pan
    const chartStartMid = intervalMidPoint(this.chartStartInterval)
    const chartPanDelta = pixelPanDelta * scaleFactor * zoomFactor
    this.chartpanDelta = chartPanDelta
    const chartPinchedMid = chartStartMid - chartPanDelta // positive pan means we like to move x-scale in negative x direction
    this.chartPincedMid = chartPinchedMid

    // Result
    const chartPinchedInterval = [
      chartPinchedMid - chartPinchedLength / 2,
      chartPinchedMid + chartPinchedLength / 2
    ]
    return { start: chartPinchedInterval[0], end: chartPinchedInterval[1] }
  }


  pix2ChartScaleFactor(): number {
    const { p0, x0, p1, x1 } = this.pixelChartScalePoints
    const pixelDiff = p1 - p0
    const chartScaleDiff = x1 - x0
    if (pixelDiff === 0) return 1 // avoid division by zero
    return chartScaleDiff / pixelDiff
  }

}

function intervalMidPoint(interval: number[]): number {
  return (interval[0] + interval[1]) / 2
}