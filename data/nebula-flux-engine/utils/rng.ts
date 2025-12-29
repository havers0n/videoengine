/**
 * A simple seeded deterministic random number generator (LCG).
 * Constants from Numerical Recipes.
 */
export class DeterministicRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Returns a float between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Returns a float between min and max.
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
