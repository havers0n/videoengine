import { SimulationConfig } from './types';

export const CONFIG: SimulationConfig = {
  particleCount: 180,
  connectionDistance: 80,
  baseSpeed: 50, // pixels per second
  dt: 1 / 120,   // Fixed timestep
  duration: 18.0 // Seconds
};

export const COLORS = {
  background: '#020617', // slate-950
  accent1: '#06b6d4',    // cyan-500
  accent2: '#d946ef',    // fuchsia-500
  accent3: '#eab308',    // yellow-500
};

export const SEED = 123456789;