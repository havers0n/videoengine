import { EngineState, CONFIG } from './types';

export const getInitialState = (): EngineState => ({
  tick: 0,
  position: 0,
  velocity: 0,
});

/**
 * Pure function that advances the state by exactly one fixed timestep.
 * Given the same input state, this will ALWAYS return the same output state.
 */
export const integrate = (currentState: EngineState): EngineState => {
  const dtSeconds = CONFIG.FIXED_TIMESTEP_MS / 1000;
  
  let { position, velocity, tick } = currentState;

  // Euler integration
  // 1. Update velocity with gravity
  velocity += CONFIG.GRAVITY * dtSeconds;

  // 2. Update position with velocity
  position += velocity * dtSeconds;

  // 3. Resolve collisions (Deterministic constraint)
  if (position >= CONFIG.FLOOR_Y) {
    position = CONFIG.FLOOR_Y;
    // Reflect velocity with energy loss
    // We explicitly check if moving down to avoid sticking if sitting on floor
    if (velocity > 0) {
        velocity = -velocity * CONFIG.BOUNCE_DAMPING;
    }
    
    // Stop completely if velocity is negligible to prevent micro-bouncing
    if (Math.abs(velocity) < CONFIG.GRAVITY * dtSeconds) {
        velocity = 0;
    }
  }

  return {
    tick: tick + 1,
    position,
    velocity,
  };
};