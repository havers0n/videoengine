export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number; // For noise calculation reference
  baseY: number;
  clusterIndex: number;
  color: string;
  radius: number;
}

export interface Cluster {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
}

export interface Hotspot {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface SimulationState {
  particles: Particle[];
  clusters: Cluster[];
  hotspots: Hotspot[];
  width: number;
  height: number;
}
