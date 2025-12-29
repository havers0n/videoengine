export interface SimulationParams {
  range: number;
  threshold: number;
  states: number;
  neighborhood: 'moore' | 'von-neumann';
}

export interface SimulationMetrics {
  entropy: number;      // 0.0 - 1.0 (Shannon entropy of state distribution)
  flux: number;         // 0.0 - 1.0 (Percentage of cells changing state per tick)
  coherence: number;    // 0.0 - 1.0 (Spatial clustering/similarity measure)
  tick: number;
}

export interface ObserverState {
  status: 'OBSERVING' | 'STABILIZING' | 'DISRUPTING' | 'TUNING';
  targetMetric: string;
  adjustment: string;
  lastActionTick: number;
}
