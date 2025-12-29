/**
 * Deterministic RNG using Mulberry32 algorithm
 * Seeded PRNG - same seed always produces same sequence
 */
export class DeterministicRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  /**
   * Returns random number between 0 and 1 (exclusive)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Returns random number between min and max
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /**
   * Returns random integer between min (inclusive) and max (exclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max))
  }
}
