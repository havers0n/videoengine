export enum StoryPhase {
  ILLUSION = 'ILLUSION', // 0-6s
  REVEAL = 'REVEAL',     // 6-12s
  RESOLUTION = 'RESOLUTION' // 12-18s
}

export const TIMING = {
  TOTAL_DURATION: 18000,
  PHASE_1_END: 6000,
  PHASE_2_END: 12000,
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  targetX: number | null;
  targetY: number | null;
  phaseOffset: number;
}

export const COLORS = {
  BG: '#050510',
  BLUE: { r: 0, g: 240, b: 255 }, // Cyan
  RED: { r: 255, g: 42, b: 42 },  // Red
  GREEN: { r: 0, g: 255, b: 157 } // Emerald
};