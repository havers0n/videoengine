export const EngineParams = {
  // Time
  TIME_STEP: 1 / 60,
  
  // Physics
  CLUSTER_COUNT: 8,
  CLUSTER_RADIUS: 6,
  CLUSTER_MASS: 1.0,
  
  SPRING_K: 0.15,
  SPRING_REST_LEN_FACTOR: 0.2, // relative to screen min dimension
  DAMPING: 0.96,
  
  HOTSPOT_COUNT: 2,
  HOTSPOT_SPEED: 0.3,
  HOTSPOT_RADIUS: 200,
  HOTSPOT_STRENGTH: 800, // Repulsive force magnitude
  
  NOISE_FORCE: 0.5,
  
  // Visuals
  COLOR_SAFE: '#00f0ff',
  COLOR_RISK: '#ff2a2a',
  COLOR_THREAD_RELAXED: '#1a2a3a',
  COLOR_THREAD_TENSE: '#ff2a2a',
  BACKGROUND: '#050505',
};