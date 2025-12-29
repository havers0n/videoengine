/**
 * Linear Congruential Generator (LCG)
 * Simple, fast, seeded RNG.
 */
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Returns a pseudo-random number between min and max.
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}