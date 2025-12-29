/**
 * Linear interpolation between a and b by t
 */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Smooth Hermite interpolation between 0 and 1 when edge0 < x < edge1.
 */
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Maps a value from one range to another
 */
export const remap = (
  value: number,
  low1: number,
  high1: number,
  low2: number,
  high2: number
) => {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
};

/**
 * Returns a random number between min and max
 */
export const randomRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

/**
 * Clamps a value between min and max
 */
export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
