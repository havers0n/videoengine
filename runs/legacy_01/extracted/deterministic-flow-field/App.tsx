import React from 'react';
import FlowFieldCanvas from './components/FlowFieldCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-black">
      <div className="absolute top-4 left-4 z-10 p-4 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 pointer-events-none">
        <h1 className="text-xl font-bold tracking-wider text-cyan-400">NEON FLOW</h1>
        <p className="text-xs text-slate-400 mt-1">
          18s Loop • Deterministic RNG • Canvas 2D
        </p>
      </div>
      
      <FlowFieldCanvas />
      
      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-600 font-mono pointer-events-none">
        RENDER: CANVAS API
      </div>
    </div>
  );
};

export default App;