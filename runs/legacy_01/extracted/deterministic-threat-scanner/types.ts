export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  active: boolean;
}

export interface Hotspot {
  id: number;
  pos: Vector2;
  radius: number;
  riskLevel: number; // 0.0 to 1.0
  pulsePhase: number;
}

export interface SimulationState {
  particles: Particle[];
  hotspots: Hotspot[];
  scanRadius: number;
  scanActive: boolean;
  scanSpeed: number;
  lastFrameTime: number;
  dimensions: { width: number; height: number };
}