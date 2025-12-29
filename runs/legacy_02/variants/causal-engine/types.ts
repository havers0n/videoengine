export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  radius: number;
  color: string;
}

export interface SimulationConfig {
  seed: number;
  entityCount: number;
  informationSpeed: number; // Pixels per tick. Lower = more delay (higher latency causality)
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  maxSpeed: number;
  maxForce: number;
  perceptionRadius: number;
  historyLength: number; // How many ticks of history to keep
}

export interface HistoryFrame {
  tick: number;
  entities: {
    id: number;
    position: Vector2;
    velocity: Vector2;
  }[];
}

export enum PlayState {
  PAUSED,
  PLAYING,
  REWINDING
}
