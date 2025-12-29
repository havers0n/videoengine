import { Vector2 } from './types';

// Pure functions for vector math to ensure determinism
// Avoids object creation where possible in critical loops for performance

export const add = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x + v2.x, y: v1.y + v2.y });
export const sub = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x - v2.x, y: v1.y - v2.y });
export const scale = (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s });

export const lengthSq = (v: Vector2): number => v.x * v.x + v.y * v.y;
export const length = (v: Vector2): number => Math.sqrt(lengthSq(v));

export const normalize = (v: Vector2): Vector2 => {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : scale(v, 1 / len);
};

// In-place operations for hot paths (memory optimization)
export const addInPlace = (target: Vector2, source: Vector2): void => {
  target.x += source.x;
  target.y += source.y;
};

export const scaleInPlace = (target: Vector2, s: number): void => {
  target.x *= s;
  target.y *= s;
};

// Linear interpolation between two vectors
export const lerpVector = (v1: Vector2, v2: Vector2, alpha: number): Vector2 => ({
  x: v1.x + (v2.x - v1.x) * alpha,
  y: v1.y + (v2.y - v1.y) * alpha,
});