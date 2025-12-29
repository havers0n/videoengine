
import { Vector } from './types';

export const Vec = {
  add: (v1: Vector, v2: Vector): Vector => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
  sub: (v1: Vector, v2: Vector): Vector => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
  mult: (v: Vector, n: number): Vector => ({ x: v.x * n, y: v.y * n }),
  div: (v: Vector, n: number): Vector => ({ x: v.x / n, y: v.y / n }),
  mag: (v: Vector): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector): Vector => {
    const m = Vec.mag(v);
    return m > 0 ? Vec.div(v, m) : { x: 0, y: 0 };
  },
  limit: (v: Vector, max: number): Vector => {
    const m = Vec.mag(v);
    if (m > max) {
      return Vec.mult(Vec.normalize(v), max);
    }
    return v;
  },
  dist: (v1: Vector, v2: Vector): number => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  setMag: (v: Vector, n: number): Vector => {
    return Vec.mult(Vec.normalize(v), n);
  }
};
