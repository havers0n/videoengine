
export interface Vector2D {
  x: number;
  y: number;
}

export interface SimulationConfig {
  particleCount: number;
  noiseIntensity: number;
  attractionForce: number;
  repulsionForce: number;
  friction: number;
  speedLimit: number;
  clusteringRadius: number;
  deterministicStep: number;
  visualGlow: boolean;
}

export interface Particle {
  id: string;
  pos: Vector2D;
  vel: Vector2D;
  acc: Vector2D;
  mass: number;
  stress: number; // 0 to 1
  clusterId: number | null;
  history: Vector2D[];
}

export interface SimulationState {
  particles: Particle[];
  avgStress: number;
  activeClusters: number;
  tickCount: number;
}
