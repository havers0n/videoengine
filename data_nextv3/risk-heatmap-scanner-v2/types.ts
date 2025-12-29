export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Point;
  vel: Vector;
  baseX: number;
  baseY: number;
  noiseOffset: number;
  color: string;
  connections: number[];
}

export interface Hotspot {
  pos: Point;
  radius: number;
  baseRadius: number;
  intensity: number;
  pulsePhase: number;
  riskLevel: number; // 0 to 1
}

export interface EngineState {
  width: number;
  height: number;
  time: number;
  scannerAngle: number;
  particles: Particle[];
  hotspots: Hotspot[];
}
