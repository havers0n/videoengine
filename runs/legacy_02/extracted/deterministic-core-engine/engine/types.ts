export interface EngineState {
  tick: number;
  position: number; // Vertical position (0 = top, >0 = down)
  velocity: number; // Vertical velocity
}

export const CONFIG = {
  // 60 Updates per second (16.666ms)
  FIXED_TIMESTEP_MS: 1000 / 60,
  GRAVITY: 500, // pixels per second squared
  BOUNCE_DAMPING: 0.8, // Retain 80% energy on bounce
  FLOOR_Y: 300, // Floor position in pixels
};