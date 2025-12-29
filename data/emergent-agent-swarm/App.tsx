
import React, { useState, useMemo, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import { SimulationEngine } from './services/SimulationEngine';
import { SimulationConfig } from './types';

const DEFAULT_CONFIG: SimulationConfig = {
  agentCount: 200,
  neighborRadius: 60,
  separationWeight: 2.0,
  alignmentWeight: 1.2,
  cohesionWeight: 1.0,
  boundaryForce: 1.5,
  stressDecay: 0.005,
  stressThreshold: 0.8,
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [resetKey, setResetKey] = useState(0);

  // Initialize engine. Memoized to avoid re-creation on config changes
  // unless we explicitly trigger a reset.
  const engine = useMemo(() => {
    return new SimulationEngine(window.innerWidth, window.innerHeight, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Update engine config without re-seeding
  const handleConfigChange = useCallback((newConfig: SimulationConfig) => {
    setConfig(newConfig);
    engine.config = newConfig;
  }, [engine]);

  const handleReset = useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      <Controls 
        config={config} 
        onChange={handleConfigChange} 
        onReset={handleReset}
      />
      
      <SimulationCanvas engine={engine} />

      <div className="absolute bottom-4 right-4 text-slate-400 text-xs bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700 backdrop-blur-sm pointer-events-none">
        No Global Controller • Fully Local Rules • Emergent Swarm
      </div>
    </div>
  );
};

export default App;
