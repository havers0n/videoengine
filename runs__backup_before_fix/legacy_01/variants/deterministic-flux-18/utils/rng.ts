/**
 * A simple seeded random number generator (Linear Congruential Generator)
 * to ensure deterministic behavior across runs.
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
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Returns a float between min (inclusive) and max (exclusive).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a random element from an array.
   */
  pick<T>(array: T[]): T {
    const index = Math.floor(this.next() * array.length);
    return array[index];
  }
}