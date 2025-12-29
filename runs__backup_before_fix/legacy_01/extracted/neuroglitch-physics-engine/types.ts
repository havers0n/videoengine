export interface Point {
  x: number;
  y: number;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  clusterIndex: number;
  isHot: boolean; // Does it belong to a "risky" cluster?
}

export interface Cluster extends Point {
  id: number;
  driftAngle: number;
}

export interface Hotspot extends Point {
  radius: number;
  intensity: number;
}

export interface SimState {
  particles: Particle[];
  clusters: Cluster[];
  hotspots: Hotspot[];
  width: number;
  height: number;
}