import { SimulationParams, SimulationMetrics, ObserverState } from '../types';
import { rng } from '../utils/random';

export class CyclicAutomaton {
  width: number;
  height: number;
  grid: Uint8Array;
  buffer: Uint8Array;
  params: SimulationParams;
  tick: number = 0;
  
  // Observer state
  observer: ObserverState = {
    status: 'OBSERVING',
    targetMetric: 'none',
    adjustment: 'none',
    lastActionTick: 0
  };

  constructor(width: number, height: number, params: SimulationParams) {
    this.width = width;
    this.height = height;
    this.params = params;
    this.grid = new Uint8Array(width * height);
    this.buffer = new Uint8Array(width * height);
    this.initializeGrid();
  }

  initializeGrid() {
    // Deterministic initialization using math functions and seeded RNG
    for (let i = 0; i < this.width * this.height; i++) {
      // Create some initial structure rather than pure noise for interesting starting conditions
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      
      // Pattern 1: Geometric Disturbance
      const cx = this.width / 2;
      const cy = this.height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      // Pattern 2: Noise with structure
      const noise = rng.next();
      
      let val = 0;
      if (dist < 20) {
        val = rng.nextInt(0, this.params.states);
      } else {
        val = Math.floor(noise * this.params.states);
      }
      
      this.grid[i] = val;
    }
  }

  step(): SimulationMetrics {
    this.tick++;
    const { width, height, grid, buffer, params } = this;
    const { range, threshold, states, neighborhood } = params;
    
    let changedCells = 0;
    const stateCounts = new Int32Array(states).fill(0);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const currentState = grid[i];
        const nextState = (currentState + 1) % states;
        
        let neighborCount = 0;

        // Neighbor check loops
        for (let dy = -range; dy <= range; dy++) {
          for (let dx = -range; dx <= range; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            // Neighborhood type check
            if (neighborhood === 'von-neumann' && Math.abs(dx) + Math.abs(dy) > range) continue;

            // Wrap-around coordinates
            const nx = (x + dx + width) % width;
            const ny = (y + dy + height) % height;
            
            if (grid[ny * width + nx] === nextState) {
              neighborCount++;
            }
          }
        }

        if (neighborCount >= threshold) {
          buffer[i] = nextState;
          changedCells++;
        } else {
          buffer[i] = currentState;
        }
        
        // Metrics: Count states for entropy
        stateCounts[buffer[i]]++;
      }
    }

    // Swap buffers
    const temp = this.grid;
    this.grid = this.buffer;
    this.buffer = temp;

    return this.calculateMetrics(changedCells, stateCounts);
  }

  calculateMetrics(changedCells: number, stateCounts: Int32Array): SimulationMetrics {
    const totalCells = this.width * this.height;
    
    // Flux: Rate of change
    const flux = changedCells / totalCells;

    // Entropy: Shannon entropy of state distribution
    let entropy = 0;
    for (let i = 0; i < stateCounts.length; i++) {
      const p = stateCounts[i] / totalCells;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    // Normalize entropy (max entropy is log2(states))
    const maxEntropy = Math.log2(this.params.states);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Coherence (Simplified): Low flux + High Entropy implies structured cyclic patterns
    // We can also approximate coherence by looking at how clustered things are, 
    // but Flux vs Entropy gives a good "Phase Space" location.
    // Let's define Coherence as 1 - Flux (Stability) * Normalized Entropy.
    const coherence = (1 - flux) * normalizedEntropy;

    return {
      flux,
      entropy: normalizedEntropy,
      coherence,
      tick: this.tick
    };
  }

  // The Meta-Layer: The system observes itself and adjusts
  observeAndAdjust(metrics: SimulationMetrics) {
    // Only adjust every N ticks to allow settling
    if (this.tick - this.observer.lastActionTick < 50) return;

    const { flux, entropy } = metrics;
    let actionTaken = false;

    // GOAL: Maintain "Criticality". 
    // Not too chaotic (Flux ~ 1), not too static (Flux ~ 0).
    // High complexity (Entropy > 0.6).

    // Scenario 1: Frozen / Death (Low Flux, Low/High Entropy)
    if (flux < 0.02) {
      this.observer.status = 'DISRUPTING';
      this.observer.targetMetric = 'flux';
      this.observer.adjustment = 'Lower Threshold';
      
      // Make it easier to change state
      if (this.params.threshold > 1) {
        this.params.threshold--;
        actionTaken = true;
      } else {
        // If threshold is already min, increase range to see more neighbors
        this.params.range++;
        // Scale threshold with range to avoid instant chaos
        this.params.threshold += 2; 
        this.observer.adjustment = 'Increase Range';
        actionTaken = true;
      }
    }
    // Scenario 2: Pure Chaos (High Flux)
    else if (flux > 0.4) {
      this.observer.status = 'STABILIZING';
      this.observer.targetMetric = 'flux';
      this.observer.adjustment = 'Raise Threshold';
      
      this.params.threshold++;
      actionTaken = true;
    }
    // Scenario 3: Monoculture (Low Entropy)
    else if (entropy < 0.3 && flux < 0.3) {
      this.observer.status = 'TUNING';
      this.observer.targetMetric = 'entropy';
      
      // Increase states to introduce diversity if possible
      if (this.params.states < 16) {
        this.observer.adjustment = 'Add State';
        this.params.states++;
        // When adding a state, existing cells stay same, new state emerges naturally
        actionTaken = true;
      } else {
         // Alternatively, reduce range to create tighter local clusters
         if (this.params.range > 1) {
            this.params.range--;
            this.params.threshold = Math.max(1, this.params.threshold - 1);
            this.observer.adjustment = 'Decrease Range';
            actionTaken = true;
         }
      }
    }
    // Scenario 4: Ideal State? (High Entropy, Moderate Flux)
    else {
      this.observer.status = 'OBSERVING';
      this.observer.adjustment = 'None';
    }

    if (actionTaken) {
      this.observer.lastActionTick = this.tick;
    }
  }

  getGrid(): Uint8Array {
    return this.grid;
  }
}
