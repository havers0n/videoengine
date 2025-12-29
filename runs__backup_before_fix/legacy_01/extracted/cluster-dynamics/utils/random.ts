/**
 * Mulberry32 is a simple and fast 32-bit pseudo-random number generator.
 */
export class Random {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Returns a number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a number between min (inclusive) and max (exclusive).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a random integer between min (inclusive) and max (exclusive).
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }
}