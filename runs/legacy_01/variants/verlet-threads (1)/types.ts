export interface Vector2 {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  vx: number; // Stored for some logical calculations, derived from verlet
  vy: number;
  pinned: boolean;
  color: string;
  radius: number;
  id: number;
}

export interface Constraint {
  p1: Point;
  p2: Point;
  restLength: number;
  stiffness: number;
  breakingThreshold: number; // Ratio of current length to rest length
}

export interface WorldState {
  points: Point[];
  constraints: Constraint[];
  width: number;
  height: number;
  mouse: Vector2;
  isMouseDown: boolean;
  time: number;
}

export interface SimulationConfig {
  pointCount: number;
  connectionDistance: number;
  friction: number;
  gravity: number;
  stiffness: number;
  breakThreshold: number;
  mouseRepelRadius: number;
  mouseRepelForce: number;
}