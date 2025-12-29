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
  color: string;
  clusterIndex: number;
  mass: number;
}

export interface Cluster {
  center: Vector2;
  targetHue: number;
  angle: number;
  radius: number;
}

export interface SimulationConfig {
  particleCount: number;
  clusterCount: number;
  connectionDistance: number;
  mouseRepulsionRadius: number;
  springStrength: number;
  damping: number;
  maxVelocity: number;
}