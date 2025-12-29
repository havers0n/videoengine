export const SIMULATION = {
  DURATION_SECONDS: 18,
  FIXED_TIMESTEP: 1 / 120, // 120Hz physics update
  MAX_FRAME_TIME: 0.25,
  PARTICLE_COUNT: 250,
  TRAIL_ALPHA: 0.15, // Lower = longer trails
  CONNECTION_DISTANCE_SQ: 80 * 80, // 80px max distance squared
  CONNECTION_DISTANCE_CHAOS_SQ: 120 * 120,
};

export const PHASES = {
  CALM: { start: 0, end: 6 },
  INSTABILITY: { start: 6, end: 12 },
  ORDER: { start: 12, end: 18 },
};

export const COLORS = {
  CALM: ['#60A5FA', '#34D399', '#A78BFA'], // Blue, Green, Purple pastels
  CHAOS: ['#F87171', '#FBBF24', '#F472B6', '#FFFFFF'], // Red, Amber, Pink, White
  ORDER: ['#FFFFFF', '#38BDF8'], // White, Sky Blue
};