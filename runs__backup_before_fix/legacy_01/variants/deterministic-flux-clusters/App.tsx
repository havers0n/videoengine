import React from 'react';
import { FluxCanvas } from './components/FluxCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 opacity-90">
          DETERMINISTIC FLUX
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-1">
          CLUSTERS: 6 | SPRING: ON | DAMPING: 0.96 | CLAMP: 3.5
        </p>
      </div>
      <FluxCanvas />
    </div>
  );
};

export default App;