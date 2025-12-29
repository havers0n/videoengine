/**
 * A seeded random number generator (Mulberry32).
 * Strictly deterministic for the simulation initialization.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Returns a float between 0 and 1.
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float between min and max.
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}