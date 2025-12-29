import React, { useState } from 'react';
import { VerletCanvas } from './components/VerletCanvas';

const App: React.FC = () => {
  const [seed, setSeed] = useState<number>(1337);

  const regenerate = () => {
    setSeed(Math.floor(performance.now()));
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900">
      <VerletCanvas seed={seed} />
      
      {/* Floating Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={regenerate}
          className="px-4 py-2 bg-cyan-900/20 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm font-bold uppercase tracking-wider rounded backdrop-blur transition-all active:scale-95"
        >
          Regenerate System
        </button>
      </div>
    </div>
  );
};

export default App;
