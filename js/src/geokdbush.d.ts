// types.d.ts

declare module 'geokdbush' {
  import type KDBush from 'kdbush';

  /**
   * Finds nearby items based on coordinates and optional filters.
   * 
   * @param index - KDBush index
   * @param lng - Longitude of the reference point.
   * @param lat - Latitude of the reference point.
   * @param maxResults - Maximum number of results to return (default: Infinity).
   * @param maxDistance - Maximum distance from the reference point (default: Infinity).
   * @param predicate - Optional filter function to include/exclude items.
   * @returns Array of item IDs that match the criteria.
   */
  export function around(
    index: KDBush,
    lng: number,
    lat: number,
    maxResults?: number,
    maxDistance?: number,
    predicate?: (id: number) => boolean
  ): number[];
}