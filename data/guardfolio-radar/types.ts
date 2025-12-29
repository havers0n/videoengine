export interface Point {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  phase1X: number;
  phase1Y: number;
  phase2X: number;
  phase2Y: number;
  active: boolean;
  alpha: number;
  size: number;
  vx: number;
  vy: number;
}

export enum AnimationPhase {
  SEARCH = 'SEARCH',
  DETECTION = 'DETECTION',
  CLARITY = 'CLARITY',
  FINISHED = 'FINISHED'
}

export interface RadarState {
  phase: AnimationPhase;
  beamAngle: number;
  progress: number; // 0 to 18 seconds
}