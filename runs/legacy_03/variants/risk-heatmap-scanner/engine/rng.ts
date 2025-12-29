/**
 * Mulberry32 seeded RNG.
 * Returns a number between 0 and 1.
 */
export function createRng(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Global instance for the engine to use, initialized in sim.ts
export type RNG = () => number;