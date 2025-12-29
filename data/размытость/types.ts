export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  z: number; // For parallax/depth simulation
  rotation: number;
  rotationSpeed: number;
  targetX?: number; // For formation phase
  targetY?: number;
}

export enum Phase {
  BLUR = 0,
  SHARP = 1,
  HUD = 2
}

export interface AnimationState {
  phase: Phase;
  progress: number; // 0 to 1 within the current phase
  globalTime: number; // ms
}