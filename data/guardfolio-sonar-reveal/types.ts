export enum AnimationPhase {
  VOID = 'VOID',
  REVEAL = 'REVEAL',
  CLARITY = 'CLARITY'
}

export interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phaseOffset: number; // For pulsing independently
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export interface AnimationState {
  phase: AnimationPhase;
  progress: number; // 0 to 1 within the current phase
  globalTime: number;
}
