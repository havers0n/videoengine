export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  color: string;
  hue: number;
  trail: Vector2[];
}

export interface GameState {
  particles: Particle[];
  width: number;
  height: number;
  mouse: Vector2;
  isMouseDown: boolean;
  frameCount: number;
  lastFpsUpdate: number;
  currentFps: number;
}

export interface EngineConfig {
  particleCount: number;
  connectionDistance: number;
  trailLength: number;
  friction: number;
  mouseRepelForce: number;
  mouseRepelRadius: number;
}
