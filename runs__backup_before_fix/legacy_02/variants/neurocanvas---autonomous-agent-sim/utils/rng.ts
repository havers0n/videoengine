/**
 * A seeded random number generator using the Mulberry32 algorithm.
 * This ensures that for a given seed, the simulation is 100% deterministic.
 */
export class SeededRNG {
  private state: number;

  constructor(seedStr: string) {
    // Hash the string seed to a number
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    this.state = h >>> 0;
  }

  /**
   * Returns a float between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ (t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float between min (inclusive) and max (exclusive).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer between min (inclusive) and max (inclusive).
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Returns a random point within the given bounds.
   */
  point(width: number, height: number): { x: number, y: number } {
    return {
      x: this.range(0, width),
      y: this.range(0, height)
    };
  }
}