import React from 'react';
import CanvasLoop from './components/CanvasLoop';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background Animation Layer */}
      <div className="absolute inset-0 z-0">
        <CanvasLoop />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-10 select-none pointer-events-none">
        <h1 className="text-3xl font-bold text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          Nebula Flux
        </h1>
        <div className="flex flex-col gap-1 mt-2 text-xs font-mono text-cyan-400/80">
          <span>TIMESTEP: FIXED (120Hz)</span>
          <span>RENDER: RAF INTERPOLATED</span>
          <span>RNG: DETERMINISTIC (LCG)</span>
          <span>CYCLE: 18 SECONDS</span>
        </div>
      </div>
      
      <div className="absolute bottom-6 right-6 z-10 text-[10px] text-white/30 font-mono text-right">
        <span>perf.now() Source</span><br/>
        <span>Accumulator Loop</span>
      </div>

    </div>
  );
};

export default App;
