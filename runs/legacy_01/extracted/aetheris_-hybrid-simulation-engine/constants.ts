
import { SimulationConfig } from './types';

export const INITIAL_CONFIG: SimulationConfig = {
  particleCount: 150,
  noiseIntensity: 0.25,
  attractionForce: 0.15,
  repulsionForce: 0.35,
  friction: 0.98,
  speedLimit: 4.0,
  clusteringRadius: 80,
  deterministicStep: 1,
  visualGlow: true,
};

export const MAX_TRAIL_LENGTH = 12;
export const STRESS_DECAY = 0.95;
export const NOISE_SCALE = 0.005;
