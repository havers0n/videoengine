export enum StoryPhase {
  ORBIT = 'ORBIT',
  COLLAPSE = 'COLLAPSE',
  LEVITATION = 'LEVITATION',
}

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  history: Point[];
  targetX?: number;
  targetY?: number;
  locked: boolean;
}

export const CONFIG = {
  PARTICLE_COUNT: 250,
  TRAIL_LENGTH: 10,
  COLORS: {
    SAFE: '#FFFFFF',
    RISK: '#FF3300',
    GUARD: '#00F0FF',
  },
  PHASE_DURATION: 6000, // 6 seconds per phase
};