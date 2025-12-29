
export enum CausalityEventType {
  NEUTRAL = 'NEUTRAL',
  SHOCK = 'SHOCK',
  REBALANCING = 'REBALANCING',
  STABILIZATION = 'STABILIZATION'
}

export interface EngineParams {
  k: number;
  friction: number;
  threshold: number;
  hotspotIntensity: number;
  hue: number;
  bloom: number;
}

export interface CausalityEvent {
  type: CausalityEventType;
  startTime: number; // seconds
  duration: number; // seconds
  params: EngineParams;
  description: string;
}

export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface TimelineState {
  currentTime: number;
  activeEvent: CausalityEvent;
  progress: number;
}
