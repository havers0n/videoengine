import { Particle, CognitiveState, SimulationConfig } from '../types';

/**
 * Applies rule-based state transitions to a particle.
 * This is the "Brain" of the engine.
 */
export const updateParticleState = (
  p: Particle, 
  neighbors: Particle[], 
  config: SimulationConfig
): Particle => {
  let { state, confidence, uncertainty, decay, age } = p;
  
  // 1. Natural Decay
  // Decay increases over time, accelerated by uncertainty
  const decayDelta = config.decayRate * (1 + uncertainty);
  decay = Math.min(1, decay + decayDelta);

  // 2. State-Specific Logic
  switch (state) {
    case CognitiveState.IDLE:
      // Transition: Input -> Perception (Simulated by external trigger usually, but here random thought)
      if (Math.random() < 0.005 && config.autoSpawn) {
        state = CognitiveState.PERCEPTION;
        confidence = 0.5;
        uncertainty = 0.5;
        decay = 0.0;
      }
      break;

    case CognitiveState.PERCEPTION:
      // Rule: High confidence pushes to Analysis
      // Rule: High uncertainty keeps it in Perception or degrades confidence
      if (confidence > 0.6) {
        state = CognitiveState.ANALYSIS;
      } else if (age > 200 && uncertainty > 0.7) {
        // If we can't figure it out, it decays
        decay += 0.05;
      }
      break;

    case CognitiveState.ANALYSIS:
      // Rule: Neighbor influence. If neighbors are Analysis or Synthesis, we gain confidence.
      const supportiveNeighbors = neighbors.filter(n => 
        n.state === CognitiveState.ANALYSIS || n.state === CognitiveState.SYNTHESIS
      ).length;

      // Analysis reduces uncertainty if surrounded by peers
      if (supportiveNeighbors > 1) {
        uncertainty = Math.max(0, uncertainty - config.learningRate);
        confidence = Math.min(1, confidence + config.learningRate);
      } else {
        // Isolation increases uncertainty
        uncertainty = Math.min(1, uncertainty + config.uncertaintyVolatility);
      }

      // Transition
      if (confidence > 0.8 && uncertainty < 0.3) {
        state = CognitiveState.SYNTHESIS;
      } else if (uncertainty > 0.9) {
        // Regression
        state = CognitiveState.PERCEPTION;
      }
      break;

    case CognitiveState.SYNTHESIS:
      // Rule: Synthesis is stable but needs high confidence to become a Decision
      // It naturally decays faster if not acted upon
      decay += config.decayRate; 

      if (confidence > 0.9 && uncertainty < 0.1) {
        state = CognitiveState.DECISION;
      }
      break;

    case CognitiveState.DECISION:
      // Decisions are brief and move to Memory
      if (age > 100) { // Arbitrary time to hold the decision visual
        state = CognitiveState.MEMORY;
      }
      break;

    case CognitiveState.MEMORY:
      // Memories are stable but fade (decay) very slowly until they are gone
      decay += (config.decayRate * 0.1); 
      break;

    case CognitiveState.DECAYED:
      // End state.
      break;
  }

  // 3. Universal Rules
  // If decay is too high, everything crumbles
  if (decay >= 1.0 && state !== CognitiveState.DECAYED) {
    state = CognitiveState.DECAYED;
    confidence = 0;
    uncertainty = 0;
  }

  return {
    ...p,
    state,
    confidence,
    uncertainty,
    decay,
    age: age + 1
  };
};
