export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Point;
  vel: Vector;
  acc: Vector;
  baseSpeed: number;
  size: number;
  color: string;
  alpha: number;
  life: number; // 0 to 1 random offset
}

export interface SystemState {
  energy: number;     // Intensity of motion (0-1)
  noise: number;      // Randomness influence (0-1)
  structure: number;  // Attraction to order (0-1)
  clarity: number;    // Visual sharpness/opacity (0-1)
  confidence: number; // Stability/Damping (0-1)
  time: number;       // Current time in ms
}
