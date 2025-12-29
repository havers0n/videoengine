export enum Phase {
  BLIND_SPOT = 'BLIND_SPOT',
  THE_TRAP = 'THE_TRAP',
  THE_MAP = 'THE_MAP',
  FINISHED = 'FINISHED'
}

export interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gridX: number; // Target position for Phase 3
  gridY: number; // Target position for Phase 3
  connections: number[]; // IDs of connected nodes
}

export interface Dimensions {
  width: number;
  height: number;
}
