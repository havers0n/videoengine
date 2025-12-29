/**
 * Mulberry32 is a fast, high-quality PRNG.
 * Returns a number between 0 and 1.
 */
export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

let currentRng: () => number;

export const initRng = (seed: number) => {
  currentRng = mulberry32(seed);
};

export const random = () => currentRng();

export const randomRange = (min: number, max: number) => {
  return min + random() * (max - min);
};