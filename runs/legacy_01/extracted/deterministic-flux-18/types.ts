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
  baseSpeed: number;
}

export interface SimulationState {
  particles: Particle[];
  totalTime: number;
  phase: 'CALM' | 'INSTABILITY' | 'ORDER';
}

export interface Hotspot {
  x: number;
  y: number;
  radius: number;
  color: string;
  strength: number;
}