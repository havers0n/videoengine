// Simple Linear Congruential Generator for deterministic "random" numbers based on a seed
export class SeededRNG {
  private m = 0x80000000;
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: number) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextInt(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }

  nextFloat(): number {
    return this.nextInt() / (this.m - 1);
  }

  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }
}

// Deterministic oscillating value based on time
export const getOscillator = (t: number, frequency: number, phase: number = 0): number => {
  return Math.sin(t * frequency + phase);
};

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const dist = (x1: number, y1: number, x2: number, y2: number) => 
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
