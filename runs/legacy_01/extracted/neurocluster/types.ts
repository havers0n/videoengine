export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  clusterId: number;
  radius: number;
  baseSpeed: number;
}

export interface SimulationConfig {
  particleCount: number;
  clusterCount: number;
  connectionDistance: number;
  clusterAttraction: number;
  globalRepulsion: number;
  friction: number;
  trailFade: number;
}

export interface GridCell {
  particles: Particle[];
}