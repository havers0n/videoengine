export interface Point {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  vx: number; // calculated for vis only
  vy: number; // calculated for vis only
  pinned: boolean;
  id: number;
}

export interface Constraint {
  p1: Point;
  p2: Point;
  length: number;
  isActive: boolean;
}

export interface SimConfig {
  gravity: number;
  friction: number;
  stiffness: number;
  connectionDistance: number;
  breakDistance: number;
  mouseRepelForce: number;
  trailAlpha: number;
}

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
}