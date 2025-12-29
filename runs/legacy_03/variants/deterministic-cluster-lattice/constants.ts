export const DURATION = 18000; // ms
export const FIXED_DT = 1 / 60; // 60 FPS physics step
export const SEED = 8675309; // Fixed seed for determinism

export const CONFIG = {
  CLUSTER_COUNT: 7,
  PARTICLE_COUNT: 350,
  TRAIL_LENGTH: 10,
  CONNECTION_DIST: 60,
  CONNECTION_DIST_SQ: 3600,
  CANVAS_WIDTH: window.innerWidth,
  CANVAS_HEIGHT: window.innerHeight,
  COLORS: {
    BG_TOP: '#0f172a',
    BG_BOTTOM: '#000000',
    CALM_PRIMARY: [0, 255, 128], // Spring Green
    CALM_SECONDARY: [0, 200, 255], // Cyan
    HOT_PRIMARY: [255, 50, 50], // Red
    HOT_SECONDARY: [255, 100, 0], // Orange
  }
};