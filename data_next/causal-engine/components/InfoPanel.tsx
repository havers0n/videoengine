import React from 'react';

interface InfoPanelProps {
  tick: number;
  fps: number;
  entityCount: number;
  delayedTicks: number; // Average delay being experienced
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ tick, fps, entityCount, delayedTicks }) => {
  return (
    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-lg text-xs font-mono shadow-xl z-10 pointer-events-none">
      <h2 className="text-emerald-400 font-bold mb-2 uppercase tracking-widest">System Metrics</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-slate-400">
        <span>INTERNAL_CLOCK:</span>
        <span className="text-slate-100">{tick.toString().padStart(6, '0')} TK</span>
        
        <span>RENDER_RATE:</span>
        <span className="text-slate-100">{fps.toFixed(1)} FPS</span>
        
        <span>ENTITIES:</span>
        <span className="text-slate-100">{entityCount}</span>

        <span title="Information Delay Speed">C (INFO_SPEED):</span>
        <span className="text-amber-400">{delayedTicks > 0 ? `${delayedTicks} px/tk` : 'INF'}</span>
      </div>
      <div className="mt-3 text-slate-500 italic border-t border-slate-800 pt-2">
        "Reality is just information arriving late."
      </div>
    </div>
  );
};
