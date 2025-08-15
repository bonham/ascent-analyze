// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PluginOptionsByType } from 'chart.js';
import type { AreaProperties } from './lib/elevationChartHelpers';

declare module 'chart.js' {
  interface PluginOptionsByType {
    ascentFillPlugin?: {
      data: AreaProperties[];
    };
  }
  interface PluginOptionsByType {
    verticalLinePlugin?: {
      xPositionManualDraw: number | null;
    };
  }
}
