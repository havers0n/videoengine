export interface Vector2 {
  x: number;
  y: number;
}

export enum EventType {
  IMPULSE = 'IMPULSE',
  EXPLOSION = 'EXPLOSION',
  RESET = 'RESET',
  PULSE = 'PULSE',
}

export interface SimulationEvent {
  type: EventType;
  position: Vector2;
  intensity: number;
  timestamp: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'core' | 'ghost';
}

export interface Trail {
  points: Vector2[];
  color: string;
  width: number;
  life: number;
}

export interface Hotspot {
  pos: Vector2;
  radius: number;
  intensity: number;
  color: string;
  decay: number;
}

export interface SimulationState {
  particles: Particle[];
  trails: Trail[];
  hotspots: Hotspot[];
  lastTick: number;
  frame: number;
}
