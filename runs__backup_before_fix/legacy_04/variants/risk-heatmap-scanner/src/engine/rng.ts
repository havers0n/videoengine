// Mulberry32 is a simple, fast, deterministic 32-bit pseudo-random number generator.
export function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Singleton instance for global deterministic use if needed, 
// though we usually instantiate per simulation reset.
export const createRng = (seed: number) => mulberry32(seed);