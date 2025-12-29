import React from 'react';
import AnimationCanvas from './components/AnimationCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col bg-neutral-900 text-white overflow-hidden">
      {/* Header / Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-lg">
          Flux Engine
        </h1>
        <p className="text-xs text-gray-400 mt-1 max-w-md">
          Deterministic 1/120Hz Fixed Timestep • Accumulator Loop • Canvas2D
        </p>
      </div>

      {/* Main Viewport */}
      <main className="flex-1 relative">
        <AnimationCanvas />
      </main>

      {/* Footer / Overlay */}
      <div className="absolute bottom-0 w-full p-4 flex justify-between items-end pointer-events-none bg-gradient-to-t from-black/90 to-transparent">
        <div className="text-[10px] font-mono text-gray-500">
           SEED: 1337 | RNG: Mulberry32
        </div>
        <div className="text-right">
           <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
           <span className="text-xs font-semibold text-gray-300 tracking-wider">LIVE RENDER</span>
        </div>
      </div>
    </div>
  );
};

export default App;