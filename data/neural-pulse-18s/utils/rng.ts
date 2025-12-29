/**
 * Mulberry32 is a simple and fast 32-bit PRNG.
 * It is deterministic based on the seed provided.
 */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a random float between min and max using the provided RNG function.
 */
export const randomRange = (rng: () => number, min: number, max: number) => {
  return min + rng() * (max - min);
};
