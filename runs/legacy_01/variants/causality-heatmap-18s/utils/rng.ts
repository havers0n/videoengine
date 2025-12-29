/**
 * A simple seeded random number generator (Mulberry32).
 * Returns a number between 0 and 1.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Returns a float between 0 (inclusive) and 1 (exclusive)
  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns a float between min and max
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  // Returns an integer between min and max (inclusive of min, exclusive of max)
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }
}