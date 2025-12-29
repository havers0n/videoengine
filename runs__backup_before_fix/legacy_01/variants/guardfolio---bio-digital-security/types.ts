export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export enum NodeState {
  HEALTHY = 'HEALTHY',
  INFECTED = 'INFECTED',
  SECURED = 'SECURED',
  ISOLATED = 'ISOLATED'
}

export interface NodeEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  state: NodeState;
  infectionTime: number; // Timestamp when infection started (0 if healthy)
  baseColor: string;
  targetPos?: Point; // For Phase 3
}

export const ANIMATION_DURATION = 18000; // 18 seconds
export const PHASE_1_DURATION = 6000;
export const PHASE_2_DURATION = 12000;
