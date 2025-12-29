/**
 * Linear Congruential Generator for deterministic randomness.
 * Allows replaying the exact same visual sequence given a seed.
 */
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Returns a float between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Returns a float between min and max
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns true/false based on probability (0-1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}
