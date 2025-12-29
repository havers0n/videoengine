import { Vector2 } from '../types';

export class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Mulberry32
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export const Vec2 = {
  create: (x = 0, y = 0): Vector2 => ({ x, y }),
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mult: (v: Vector2, n: number): Vector2 => ({ x: v.x * n, y: v.y * n }),
  div: (v: Vector2, n: number): Vector2 => ({ x: v.x / n, y: v.y / n }),
  mag: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector2): Vector2 => {
    const m = Math.sqrt(v.x * v.x + v.y * v.y);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
  },
  dist: (a: Vector2, b: Vector2): number => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)),
  limit: (v: Vector2, max: number): Vector2 => {
    const mSq = v.x * v.x + v.y * v.y;
    if (mSq > max * max) {
      const m = Math.sqrt(mSq);
      return { x: (v.x / m) * max, y: (v.y / m) * max };
    }
    return v;
  },
  lerp: (a: Vector2, b: Vector2, t: number): Vector2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),
};
