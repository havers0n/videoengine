export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  // Current position
  x: number;
  y: number;
  // Target position (Grid state)
  targetX: number;
  targetY: number;
  // Initial random position (Chaos state)
  startX: number;
  startY: number;
  // Neighbors for drawing connections
  neighbors: number[]; // Indices of connected particles
  size: number;
}

export enum AnimationPhase {
  VOID = 'VOID', // 0-6s
  PING = 'PING', // 6-12s
  CLARITY = 'CLARITY', // 12-18s
  COMPLETE = 'COMPLETE' // 18s+
}