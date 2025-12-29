export const GRID_COLS = 48;
export const GRID_ROWS = 27;
export const PARTICLE_COUNT = 1500;
export const SEED = 123456789;
export const TIMESTEP = 1 / 60; // Fixed update step
export const TOTAL_LOOP_DURATION = 18; // Seconds

// Narrative Phases
export const PHASE_THRESHOLDS = {
  CALM: 0,
  WARNING: 6,
  LOCK_IN: 13,
  END: 18
};

export enum ScannerPhase {
  IDLE = 'IDLE',
  CALM = 'CALM',
  WARNING = 'WARNING',
  LOCK_IN = 'LOCK_IN'
}

export const COLORS = {
  TEAL: '#00f0ff',
  RED: '#ff2a2a',
  WHITE: '#ffffff',
  DARK_BG: '#050505',
};