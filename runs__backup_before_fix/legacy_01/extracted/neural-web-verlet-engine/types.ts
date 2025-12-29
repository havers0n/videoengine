export interface Point {
  id: number;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
  mass: number;
  color: string;
}

export interface Constraint {
  id: string;
  p1: Point;
  p2: Point;
  length: number;
  stiffness: number;
  breakingThreshold: number; // Ratio of length at which it snaps (e.g., 2.0 = 200% length)
  active: boolean;
}

export interface Hotspot {
  x: number;
  y: number;
  radius: number;
  strength: number; // Positive = repel, Negative = attract
  color: string;
}

export interface SimState {
  points: Point[];
  constraints: Constraint[];
  hotspots: Hotspot[];
  width: number;
  height: number;
  seed: number;
}
