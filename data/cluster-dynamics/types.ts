export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  clusterId: number;
  history: Point[];
}

export interface SimulationConfig {
  particleCount: number;
  clusterCount: number;
  connectionDistance: number;
  viscosity: number;
  drag: number;
  clusterStrength: number;
  repulsionStrength: number;
}

export interface ClusterInfo {
  id: number;
  color: string;
  targetX?: number; // Optional center of gravity for the cluster
  targetY?: number;
}