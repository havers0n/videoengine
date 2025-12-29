export const DURATION_MS = 18000; // 18 seconds cycle
export const PARTICLE_COUNT = 800; // Number of particles
export const FADE_OUT_DURATION = 2000; // Time to fade out before reset

// Color Palette
export const COLORS = {
  BACKGROUND: '#050505',
  PARTICLE_A: '#4fd1c5', // Teal 400
  PARTICLE_B: '#63b3ed', // Blue 400
  PARTICLE_C: '#f6ad55', // Orange 400 (Accent)
  TEXT: 'rgba(255, 255, 255, 0.7)',
};

export const TEXT_MESSAGES = [
  { start: 1000, end: 4000, text: "SEARCHING FOR SIGNAL..." },
  { start: 6000, end: 9000, text: "PATTERN EMERGING" },
  { start: 10000, end: 13000, text: "AWAITING LOCK" },
  { start: 14000, end: 17000, text: "SYSTEM STABILIZED" },
];
