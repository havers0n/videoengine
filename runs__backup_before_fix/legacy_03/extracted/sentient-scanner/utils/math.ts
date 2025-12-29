import { SEED } from '../constants';

// Simple Linear Congruential Generator for deterministic randomness
class LCG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  // Range [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export const rng = new LCG(SEED);

export const degToRad = (deg: number) => (deg * Math.PI) / 180;

// Simple Pseudo-Perlin-like noise function (2D + time)
// Composed of sines/cosines for determinism and performance without external libs
export const simpleNoise3D = (x: number, y: number, t: number): number => {
  const scale = 0.1;
  const v = 
    Math.sin(x * scale + t * 0.5) + 
    Math.cos(y * scale + t * 0.3) + 
    Math.sin((x + y) * scale * 0.5 + t);
  return v; // Returns roughly -3 to 3
};

export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const mapRange = (value: number, low1: number, high1: number, low2: number, high2: number) => {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
};