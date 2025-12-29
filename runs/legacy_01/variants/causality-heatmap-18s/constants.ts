export const LOOP_DURATION_MS = 18000;
export const GRID_COLS = 64;
export const GRID_ROWS = 36;
export const PARTICLE_COUNT = 150;
export const SEED = 12345;

// Color Palette (Tailwind-ish mappings)
export const COLORS = {
  background: '#0f172a', // slate-900
  gridBase: 'rgba(30, 41, 59, 0.3)', // slate-800
  heatLow: [15, 23, 42], // rgb for slate-900
  heatHigh: [244, 63, 94], // rgb for rose-500
  particle: '#38bdf8', // sky-400
  particleHot: '#facc15', // yellow-400
  thread: 'rgba(255, 255, 255, 0.15)',
  pulse: 'rgba(236, 72, 153, 0.2)', // pink-500
};

export const TRAIL_LENGTH = 12;
export const THREAD_DISTANCE_SQ = 4000; // Distance squared for connection threshold
export const HEAT_THRESHOLD_FOR_LINK = 0.3; // Minimum heat for particles to form stronger bonds