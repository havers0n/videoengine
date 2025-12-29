import React, { useState } from 'react';
import NeonCanvas from './components/NeonCanvas';

// Icons
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21v-5h5" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const App: React.FC = () => {
  const [seed, setSeed] = useState(12345);
  const [showInfo, setShowInfo] = useState(false);

  const randomize = () => {
    setSeed(Math.floor(Math.random() * 999999));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <NeonCanvas seed={seed} />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl pointer-events-auto transition-all hover:bg-black/60">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter">
            NEON PULSE
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-widest">
            Deterministic Engine
          </p>
        </div>

        <div className="flex gap-2 pointer-events-auto">
           <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-gray-300"
            aria-label="Info"
          >
            <InfoIcon />
          </button>
          <button
            onClick={randomize}
            className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-cyan-400"
            aria-label="Randomize Seed"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* Info Modal/Panel */}
      <div 
        className={`absolute bottom-8 left-8 max-w-sm z-10 transition-all duration-500 transform ${showInfo ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}
      >
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-2">Engine Stats</h3>
          <ul className="space-y-2 text-sm text-gray-400 font-mono">
             <li className="flex justify-between">
              <span>Seed:</span> <span className="text-cyan-400">{seed}</span>
            </li>
            <li className="flex justify-between">
              <span>Render:</span> <span className="text-green-400">Canvas 2D</span>
            </li>
            <li className="flex justify-between">
              <span>Logic:</span> <span className="text-purple-400">Seeded RNG / Event Bus</span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
            Click anywhere to spawn impulse shockwaves.
            <br/>
            Engine uses requestAnimationFrame with zero React state updates during cycle.
          </div>
        </div>
      </div>
      
      {/* Sticky footer for mobile call to action if needed, though simpler is better here */}
      <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] text-white/20 font-mono">
        v1.0.0
      </div>
    </div>
  );
};

export default App;