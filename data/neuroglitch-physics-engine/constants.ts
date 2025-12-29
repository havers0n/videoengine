export const CONFIG = {
  // Timeline
  LOOP_DURATION_MS: 18000,
  
  // Counts
  PARTICLE_COUNT: 180,
  CLUSTER_COUNT: 6,
  HOTSPOT_COUNT: 3,

  // Physics
  FRICTION: 0.94,
  SPRING_STRENGTH: 0.005, // Pull towards cluster center
  JITTER_AMP: 0.15, // Random noise amplitude
  MOUSE_REPULSION: 0.5,
  
  // Visuals
  CONNECTION_DIST_SQ: 60 * 60, // Distance squared for drawing lines
  TRAIL_ALPHA: 0.25, // Lower = longer trails
  
  // Hotspot Phase (40% to 70%)
  RISK_PHASE_START: 0.4,
  RISK_PHASE_END: 0.7,

  // Colors
  COLOR_BG: '#050505',
  COLOR_TEAL: '#00f2ff',
  COLOR_RED: '#ff0055',
  COLOR_TEAL_DIM: 'rgba(0, 242, 255, 0.1)',
  COLOR_RED_DIM: 'rgba(255, 0, 85, 0.2)',
};