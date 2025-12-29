/**
 * Mulberry32 seeded random number generator.
 * returns a number between 0 and 1.
 */
export function createRNG(seed: number) {
  let state = seed;
  return function() {
    let t = (state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Global instance for the simulation context if needed, 
// but we prefer passing instances.
export const defaultRNG = createRNG(1337);