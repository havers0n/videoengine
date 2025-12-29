// Mulberry32 seeded RNG for deterministic results
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a number between 0 and 1
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns a number between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns integer between min and max (inclusive min, exclusive max)
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  // Returns true or false based on probability (0-1)
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}