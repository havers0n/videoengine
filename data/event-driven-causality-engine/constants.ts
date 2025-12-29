
import { CausalityEventType, CausalityEvent, EngineParams } from './types';

export const TIMELINE_DURATION = 18; // 18 seconds total
export const PARTICLE_COUNT = 300;
export const SEED = 42;

const BASE_PARAMS: EngineParams = {
  k: 0.02,
  friction: 0.98,
  threshold: 80,
  hotspotIntensity: 0,
  hue: 200,
  bloom: 5
};

export const EVENT_TIMELINE: CausalityEvent[] = [
  {
    type: CausalityEventType.NEUTRAL,
    startTime: 0,
    duration: 6,
    description: "Equilibrium is established. Standard causality flows.",
    params: { ...BASE_PARAMS }
  },
  {
    type: CausalityEventType.SHOCK,
    startTime: 6,
    duration: 4,
    description: "System shock triggered. Kinetic energy surges.",
    params: {
      k: 0.45,
      friction: 0.995,
      threshold: 220,
      hotspotIntensity: 8.5,
      hue: 0, // Red
      bloom: 25
    }
  },
  {
    type: CausalityEventType.REBALANCING,
    startTime: 10,
    duration: 5,
    description: "Dynamic redistribution. Forces seek new alignment.",
    params: {
      k: 0.08,
      friction: 0.94,
      threshold: 150,
      hotspotIntensity: 1.2,
      hue: 280, // Purple/Blue
      bloom: 12
    }
  },
  {
    type: CausalityEventType.STABILIZATION,
    startTime: 15,
    duration: 3,
    description: "Entropy settles. Kinetic energy dissipates.",
    params: {
      k: 0.01,
      friction: 0.88,
      threshold: 60,
      hotspotIntensity: 0,
      hue: 180, // Cyan
      bloom: 2
    }
  }
];
