/**
 * Simple Mulberry32 seeded RNG.
 * Deterministic for the same seed.
 */
export function createRng(seed: number) {
  let s = seed;
  return function() {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper to get range [min, max)
export function randomRange(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}