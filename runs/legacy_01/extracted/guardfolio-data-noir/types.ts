export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number; // Velocity X
  vy: number; // Velocity Y
  originX: number; // For noise base
  originY: number;
  targetX: number; // For structured formation
  targetY: number;
  color: string;
  isScanned: boolean; // Has the Phase 3 scanline hit this particle?
}

export enum AnimationPhase {
  ILLUSION = 0,
  RISK = 1,
  SOLUTION = 2,
  BRANDING = 3,
}

export const COLORS = {
  STABLE: '#FFFFFF',
  RISK: '#FF4444',
  AI: '#00E5FF',
};

export const CONFIG = {
  PARTICLE_COUNT: 60,
  CYCLE_DURATION: 20000, // 20 seconds
  PHASE_DURATION: 5000, // 5 seconds each
};