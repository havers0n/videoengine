import React from 'react';
import SimulationCanvas from './components/SimulationCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden selection:bg-cyan-500 selection:text-black">
      <SimulationCanvas />
      
      {/* Overlay UI Layer */}
      <div className="absolute top-0 left-0 p-6 pointer-events-none z-10">
        <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          PHASE_SHIFT
        </h1>
        <p className="text-xs text-cyan-700/80 mt-1 uppercase tracking-widest">
          Deterministic Physics Engine // 18s Cycle
        </p>
      </div>

      <div className="absolute bottom-6 left-6 text-[10px] text-gray-500 font-mono pointer-events-none">
        <div className="flex flex-col gap-1">
          <span>RENDER: CANVAS 2D</span>
          <span>MODE: RAF LOOP (NO REACT STATE)</span>
          <span>PRECISION: HIGH</span>
        </div>
      </div>
    </div>
  );
};

export default App;