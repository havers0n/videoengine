import React, { useState, useCallback, useRef } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { EngineConfig } from './engine/types';

const INITIAL_CONFIG: EngineConfig = {
  gravityStrength: 2000,
  damping: 0.99,
  timeScale: 1.0,
  particleCount: 1500,
  swirlStrength: 500,
};

const App: React.FC = () => {
  const [config, setConfig] = useState<EngineConfig>(INITIAL_CONFIG);
  
  // We use a ref to communicate imperative commands to the engine
  // without forcing React re-renders of the canvas component.
  const engineRef = useRef<{ reset: () => void } | null>(null);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col md:flex-row bg-slate-950 text-slate-200 overflow-hidden">
      <div className="relative flex-grow h-full order-2 md:order-1">
        <SimulationCanvas 
          config={config} 
          onEngineMount={(engine) => { engineRef.current = engine; }}
        />
        <div className="absolute top-4 left-4 pointer-events-none">
          <h1 className="text-2xl font-bold text-white tracking-wider opacity-80">
            DETERMINISTIC<span className="text-cyan-400">CORE</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            FIXED_TIMESTEP_INTEGRATOR // 60HZ
          </p>
        </div>
      </div>

      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/95 p-6 backdrop-blur order-1 md:order-2 z-10 shadow-xl overflow-y-auto">
        <ControlPanel 
          config={config} 
          onConfigChange={setConfig} 
          onReset={handleReset} 
        />
      </div>
    </div>
  );
};

export default App;