/**
 * A simple Linear Congruential Generator (LCG) for deterministic results.
 * Using constants from Numerical Recipes.
 */
export class DeterministicRNG {
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
   * Returns a pseudo-random number between min (inclusive) and max (exclusive).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
