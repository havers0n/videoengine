/**
 * Linear Congruential Generator (LCG) for deterministic randomness.
 * Replaces Math.random() to ensure simulation reproducibility.
 */
export class DeterministicRandom {
  private seed: number;

  constructor(seed: number = 1337) {
    this.seed = seed;
  }

  /**
   * Returns a float between 0 and 1.
   */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Returns a float between min and max.
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer between min and max (inclusive of min, exclusive of max).
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }
}