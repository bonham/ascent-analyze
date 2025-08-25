import { describe, test, expect } from 'vitest'
import { stretchInterval, roundToNextOdd } from '@/lib/appHelpers';

describe("AppHelpers", () => {
  test("stretch_inteval", () => {
    const I_max = 100;
    const k = 40;
    const l = 50;
    const m = 45;
    const f = 1.3;
    const result = stretchInterval(I_max, k, l, m, f);
    expect(result).toEqual({ start: 38, end: 51 });
  })
})

describe("Round to next odd 2", () => {
  test.each([
    [4, 5],
    [5, 5],
    [4.9, 5],
    [3.9, 3],
    [4.1, 5],
    [5.9999, 5],
    [6, 7],
    [0.1, 1],
    [-0.1, -1],
    [-1, -1],
    [-1.9, -1],
    [-2.1, -3],
    [0, 1],
  ])("roundUpToNextOdd(%s) should return %s", (input, expected) => {
    expect(roundToNextOdd(input)).toBe(expected);
  });
});
