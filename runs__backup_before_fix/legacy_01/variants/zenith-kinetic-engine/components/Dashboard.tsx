
import React from 'react';
import { EngineState, SystemPhase } from '../types';

interface Props {
  state: EngineState;
  onBoost: () => void;
  onToggleAuto: () => void;
  autoCycle: boolean;
}

const Dashboard: React.FC<Props> = ({ state, onBoost, onToggleAuto, autoCycle }) => {
  const getPhaseColor = (p: SystemPhase) => {
    switch (p) {
      case SystemPhase.DORMANT: return 'text-slate-500';
      case SystemPhase.GATHERING: return 'text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]';
      case SystemPhase.SURGING: return 'text-amber-400';
      case SystemPhase.DISCHARGE: return 'text-white font-bold';
      case SystemPhase.COOLING: return 'text-purple-400';
      default: return 'text-white';
    }
  };

  const getProgressColor = () => {
    if (state.energy > 90) return 'bg-white';
    if (state.energy > 60) return 'bg-amber-400';
    return 'bg-cyan-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
      {/* State Monitor */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-lg flex flex-col gap-3">
        <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest">
          <span>System Phase</span>
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
        </div>
        <div className={`text-2xl tracking-tighter transition-all duration-300 ${getPhaseColor(state.phase)}`}>
          {state.phase}
        </div>
        <div className="flex gap-1 h-1">
          {Object.values(SystemPhase).map(p => (
            <div 
              key={p} 
              className={`flex-1 transition-all duration-500 ${state.phase === p ? 'bg-cyan-500' : 'bg-white/5'}`}
            />
          ))}
        </div>
      </div>

      {/* Energy Core */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-lg flex flex-col gap-3">
        <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest">
          <span>Kinetic Potential</span>
          <span>{Math.round(state.energy)}%</span>
        </div>
        <div className="relative h-8 w-full bg-black/40 overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-75 ${getProgressColor()}`}
            style={{ width: `${state.energy}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-1 ${state.energy > (i+1)*25 ? 'bg-white/40' : 'bg-white/5'}`} />
          ))}
        </div>
      </div>

      {/* Control Interface */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-lg flex flex-col gap-3">
        <div className="text-[10px] text-white/40 uppercase tracking-widest">Engine Control</div>
        <div className="flex gap-3 h-full">
          <button 
            onClick={onBoost}
            disabled={state.phase === SystemPhase.DISCHARGE}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 transition-all text-[10px] uppercase font-bold tracking-widest disabled:opacity-20"
          >
            Inject Energy
          </button>
          <button 
            onClick={onToggleAuto}
            className={`px-4 text-[10px] uppercase font-bold tracking-widest transition-all border ${
              autoCycle 
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
              : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            {autoCycle ? 'Auto: ON' : 'Auto: OFF'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide {
          from { background-position: 0 0; }
          to { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
