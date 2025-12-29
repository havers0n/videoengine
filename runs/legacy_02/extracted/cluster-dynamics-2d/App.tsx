import React from 'react';
import Simulation from './components/Simulation';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-neutral-950 overflow-hidden text-white font-sans">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Cluster Dynamics
        </h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
          Spatial Hash • Fixed Timestep (120hz) • Seeded RNG
        </p>
      </div>
      
      <div className="absolute bottom-6 left-6 z-10 text-[10px] text-neutral-600 pointer-events-none">
         <p>DRAG to disrupt • HOVER for info</p>
      </div>

      <Simulation />
    </div>
  );
};

export default App;