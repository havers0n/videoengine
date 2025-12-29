import React, { useState } from 'react';
import VerletSimulation from './components/VerletSimulation';
import { SimConfig } from './types';
import { RefreshCcw, Settings2, Info } from 'lucide-react';

const DEFAULT_CONFIG: SimConfig = {
  gravity: 0.15,
  friction: 0.98,
  stiffness: 0.9,
  connectionDistance: 30, // Distance to re-heal
  breakDistance: 120, // Distance to snap
  mouseRepelForce: 5,
  trailAlpha: 0.85, // 1 is no trail (instant clear), 0.1 is long trail
};

function App() {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [seed, setSeed] = useState<number>(12345);
  const [showControls, setShowControls] = useState<boolean>(true);

  const handleReset = () => {
    setSeed(Math.floor(performance.now()));
  };

  const updateConfig = (key: keyof SimConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      {/* Header / Overlay */}
      <div className="absolute top-0 left-0 w-full z-10 pointer-events-none p-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-sm tracking-tight">
            Verlet Threads
          </h1>
          <p className="text-sm text-neutral-400 opacity-80 max-w-md mt-1">
            Interactive physics using Verlet integration. Mouse over to repel nodes and tear threads. 
            Threads heal when nodes drift close.
          </p>
        </div>

        <div className="pointer-events-auto flex gap-2">
           <button 
            onClick={() => setShowControls(!showControls)}
            className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 backdrop-blur-md transition-all border border-neutral-700/50"
            title="Toggle Controls"
          >
            <Settings2 size={20} className="text-cyan-400" />
          </button>
          <button 
            onClick={handleReset}
            className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 backdrop-blur-md transition-all border border-neutral-700/50"
            title="Reset Simulation"
          >
            <RefreshCcw size={20} className="text-fuchsia-400" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <main className="flex-1 relative">
        <VerletSimulation config={config} seed={seed} />
      </main>

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute top-24 right-6 w-72 bg-neutral-900/80 backdrop-blur-lg border border-neutral-800 p-5 rounded-2xl shadow-2xl z-20 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="flex items-center gap-2 mb-4 text-neutral-300 border-b border-neutral-800 pb-2">
             <Info size={16} />
             <span className="text-xs font-medium uppercase tracking-wider">Physics Parameters</span>
           </div>
           
           <div className="space-y-4">
             {/* Gravity */}
             <div className="flex flex-col gap-1">
               <div className="flex justify-between text-xs text-neutral-400">
                 <span>Gravity</span>
                 <span>{config.gravity.toFixed(2)}</span>
               </div>
               <input 
                  type="range" min="-0.5" max="1.0" step="0.01" 
                  value={config.gravity}
                  onChange={(e) => updateConfig('gravity', parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
             </div>

             {/* Friction */}
             <div className="flex flex-col gap-1">
               <div className="flex justify-between text-xs text-neutral-400">
                 <span>Air Friction</span>
                 <span>{config.friction.toFixed(3)}</span>
               </div>
               <input 
                  type="range" min="0.800" max="0.999" step="0.001" 
                  value={config.friction}
                  onChange={(e) => updateConfig('friction', parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
               />
             </div>

             {/* Stiffness */}
             <div className="flex flex-col gap-1">
               <div className="flex justify-between text-xs text-neutral-400">
                 <span>Thread Stiffness</span>
                 <span>{config.stiffness.toFixed(2)}</span>
               </div>
               <input 
                  type="range" min="0.01" max="1.0" step="0.01" 
                  value={config.stiffness}
                  onChange={(e) => updateConfig('stiffness', parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
             </div>

             {/* Break Distance */}
             <div className="flex flex-col gap-1">
               <div className="flex justify-between text-xs text-neutral-400">
                 <span>Tear Threshold</span>
                 <span>{config.breakDistance}px</span>
               </div>
               <input 
                  type="range" min="50" max="300" step="10" 
                  value={config.breakDistance}
                  onChange={(e) => updateConfig('breakDistance', parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-red-500"
               />
             </div>

              {/* Trail Alpha */}
             <div className="flex flex-col gap-1">
               <div className="flex justify-between text-xs text-neutral-400">
                 <span>Motion Blur</span>
                 <span>{((1 - config.trailAlpha) * 100).toFixed(0)}%</span>
               </div>
               <input 
                  type="range" min="0.1" max="1.0" step="0.01" 
                  value={config.trailAlpha}
                  onChange={(e) => updateConfig('trailAlpha', parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
               />
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;