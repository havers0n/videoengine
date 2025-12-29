/**
 * A simple seeded random number generator (Mulberry32).
 * Ensures visualization is deterministic if the same seed is used.
 */
export class DeterministicRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Returns a float between 0 and 1.
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float between min and max.
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns true/false based on probability (0-1).
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export const defaultRNG = new DeterministicRNG(1337);