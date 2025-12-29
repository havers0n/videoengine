export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  size: number;
  phaseOffset: number;
  id: number;
  history: Point[];
}

export interface SimulationState {
  particles: Particle[];
  width: number;
  height: number;
  phase: 'CALM' | 'ANOMALY' | 'RESOLUTION';
}

export interface HudData {
  riskScore: number;
  hiddenExposure: number;
  correlationSpike: number;
  liquidityStress: number;
  status: string;
}

export enum Phase {
  CALM = 'CALM',
  ANOMALY = 'ANOMALY',
  RESOLUTION = 'RESOLUTION'
}