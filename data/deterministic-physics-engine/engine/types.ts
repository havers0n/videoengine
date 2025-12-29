export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  // Current state
  position: Vector2;
  velocity: Vector2;
  mass: number;
  color: string;
  
  // Previous state (for interpolation)
  prevPosition: Vector2;
}

export interface EngineConfig {
  gravityStrength: number; // Central attraction
  damping: number;        // Velocity decay per step (0-1)
  timeScale: number;      // Multiplier for dt
  particleCount: number;
  swirlStrength: number;  // Tangential force
}

export interface RenderStats {
  fps: number;
  particleCount: number;
  physicsTime: number;
}