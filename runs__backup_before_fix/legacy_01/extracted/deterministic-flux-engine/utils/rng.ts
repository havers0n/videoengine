/**
 * A simple, fast, and deterministic pseudo-random number generator.
 * Using Mulberry32 algorithm.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Returns a float between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ (t >>> 14);
    return ((t >>> 0) / 4294967296);
  }

  /**
   * Returns a float between min (inclusive) and max (exclusive).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}