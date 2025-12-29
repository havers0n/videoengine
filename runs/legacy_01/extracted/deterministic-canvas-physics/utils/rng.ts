/**
 * Mulberry32 is a simple and fast 32-bit pseudo-random number generator.
 * It is deterministic based on the seed provided.
 */
export const createRNG = (seed: number) => {
  let state = seed;

  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Helper to get a random range using the provided RNG instance
export const randomRange = (rng: () => number, min: number, max: number) => {
  return min + rng() * (max - min);
};

// Helper to get a random color
export const randomColor = (rng: () => number, saturation: number = 70, lightness: number = 60) => {
  const hue = Math.floor(rng() * 360);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
