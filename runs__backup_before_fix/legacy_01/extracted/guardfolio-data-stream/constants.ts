import { StreamPhase } from './types';

export const PHASE_DURATION = 5000; // 5 seconds per phase
export const TOTAL_CYCLE_DURATION = 15000; // 15 seconds total

export const COLORS = {
  [StreamPhase.FLOW]: '229, 231, 235', // gray-200 (Silver/White)
  [StreamPhase.TURBULENCE]: '239, 68, 68', // red-500
  [StreamPhase.CHANNELING]: '6, 182, 212', // cyan-500
};

export const TEXT_CONFIG = {
  [StreamPhase.FLOW]: {
    title: "PERFORMANCE FLOW",
    status: "NOMINAL",
    desc: "Data integrity verified. Latency minimal."
  },
  [StreamPhase.TURBULENCE]: {
    title: "SYSTEM ALERT",
    status: "VOLATILITY SPIKE",
    desc: "External anomaly detected. Packet scattering imminent."
  },
  [StreamPhase.CHANNELING]: {
    title: "GUARDFOLIO PROTOCOL",
    status: "GUIDED STABILITY",
    desc: "Rerouting traffic through secure tunnel. Velocity stabilizing."
  }
};