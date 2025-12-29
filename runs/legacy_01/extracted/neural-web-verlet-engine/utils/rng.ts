export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Mulberry32 algorithm
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Range [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Range [min, max) integer
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  // Random item from array
  pick<T>(array: T[]): T {
    return array[this.rangeInt(0, array.length)];
  }
  
  // 50/50 boolean
  bool(): boolean {
    return this.next() > 0.5;
  }
}
