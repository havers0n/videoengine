import { CognitiveState } from './types';

export const STATE_COLORS: Record<CognitiveState, string> = {
  [CognitiveState.IDLE]: '#64748b',       // Slate 500
  [CognitiveState.PERCEPTION]: '#38bdf8', // Sky 400
  [CognitiveState.ANALYSIS]: '#facc15',   // Yellow 400
  [CognitiveState.SYNTHESIS]: '#fb923c',  // Orange 400
  [CognitiveState.DECISION]: '#4ade80',   // Green 400
  [CognitiveState.MEMORY]: '#818cf8',     // Indigo 400
  [CognitiveState.DECAYED]: '#334155',    // Slate 700
};

export const STATE_DESCRIPTIONS: Record<CognitiveState, string> = {
  [CognitiveState.IDLE]: 'Dormant state waiting for stimuli.',
  [CognitiveState.PERCEPTION]: 'Initial data intake and raw observation.',
  [CognitiveState.ANALYSIS]: 'Processing structure and identifying patterns.',
  [CognitiveState.SYNTHESIS]: 'Combining patterns into coherent thoughts.',
  [CognitiveState.DECISION]: 'Finalized actionable conclusion.',
  [CognitiveState.MEMORY]: 'Archived state for future reference.',
  [CognitiveState.DECAYED]: 'Lost or irrelevant cognitive artifact.',
};

export const SIMULATION_WIDTH = 1200;
export const SIMULATION_HEIGHT = 800;
