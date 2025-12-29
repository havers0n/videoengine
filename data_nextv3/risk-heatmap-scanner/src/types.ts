export interface Point {
  x: number;
  y: number;
}

export interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  riskLevel: number; // 0 to 1
  clusterId: number;
  active: boolean;
  pulsePhase: number;
}

export interface Cluster {
  id: number;
  centerX: number;
  centerY: number;
  driftX: number;
  driftY: number;
  color: string;
}

export interface ScanRing {
  active: boolean;
  radius: number;
  maxRadius: number;
  x: number;
  y: number;
  speed: number;
}

export interface Hotspot {
  x: number;
  y: number;
  intensity: number;
  radius: number;
  decay: number;
}

export interface EngineState {
  width: number;
  height: number;
  time: number;
  nodes: Node[];
  clusters: Cluster[];
  scanRings: ScanRing[];
  hotspots: Hotspot[];
  mouse: Point;
}