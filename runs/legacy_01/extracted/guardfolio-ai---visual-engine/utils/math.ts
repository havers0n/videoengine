export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const clamp = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, val));
};

export const smoothstep = (min: number, max: number, value: number): number => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

// Simple pseudo-random with seed to ensure deterministic animation if needed
// For now using Math.random for visual variance is acceptable as requested "organic motion"
export const randomRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};
