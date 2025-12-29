import React from 'react';

interface StatsOverlayProps {
  time: number;
  fps: number;
  particleCount: number;
  completed: boolean;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({ time, fps, particleCount, completed }) => {
  return (
    <div className="absolute top-4 left-4 pointer-events-none z-10 font-mono text-xs select-none">
      <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-lg shadow-xl text-cyan-400">
        <h1 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Flux Engine v1</h1>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <span className="text-slate-500">TIMESTEP</span>
          <span className="text-right">120hz (FIXED)</span>

          <span className="text-slate-500">TIME</span>
          <span className={`text-right ${completed ? 'text-green-400' : 'text-white'}`}>
            {time.toFixed(3)}s / 18.000s
          </span>

          <span className="text-slate-500">FPS</span>
          <span className="text-right">{Math.round(fps)}</span>

          <span className="text-slate-500">ENTITIES</span>
          <span className="text-right">{particleCount}</span>

          <span className="text-slate-500">RNG</span>
          <span className="text-right">DETERMINISTIC</span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${completed ? 'bg-green-500' : 'bg-fuchsia-500'} transition-all duration-75 ease-linear`}
            style={{ width: `${Math.min(100, (time / 18) * 100)}%` }}
          />
        </div>
        
        {completed && (
           <div className="mt-2 text-center text-green-400 font-bold animate-pulse">
             SIMULATION COMPLETE
           </div>
        )}
      </div>
    </div>
  );
};