export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  radius: number;
  baseColor: string;
  life: number;
  angle: number; // For orbital mechanics
  distance: number; // Distance from center
}

export interface SystemState {
  energy: number;      // 0-1: Intensity of motion
  noise: number;       // 0-1: Randomness/Chaos
  structure: number;   // 0-1: Grid alignment vs organic flow
  tension: number;     // 0-1: Stretching of connections
  focusX: number;      // -1 to 1: Horizontal center of attention
  focusY: number;      // -1 to 1: Vertical center of attention
  phase: 'stability' | 'risk' | 'control';
}

export const CYCLE_DURATION = 18000; // 18 seconds
