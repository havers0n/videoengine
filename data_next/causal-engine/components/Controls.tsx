import React from 'react';
import { SimulationConfig, PlayState } from '../types';

interface ControlsProps {
  config: SimulationConfig;
  playState: PlayState;
  onConfigChange: (c: Partial<SimulationConfig>) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onStep: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  config,
  playState,
  onConfigChange,
  onTogglePlay,
  onReset,
  onStep
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-20">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        
        {/* Playback Controls */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex gap-2">
            <button
              onClick={onTogglePlay}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                playState === PlayState.PLAYING
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20'
                  : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              }`}
            >
              {playState === PlayState.PLAYING ? 'PAUSE' : 'PLAY'}
            </button>
            <button
              onClick={onStep}
              disabled={playState === PlayState.PLAYING}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              STEP
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-lg bg-slate-800 text-red-400 border border-slate-700 hover:bg-slate-700 hover:text-red-300 transition-colors"
            >
              RESET
            </button>
          </div>
          <div className="text-right">
             <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Causality Engine v1.0</div>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono uppercase text-amber-400">
              <label>Info Speed (Speed of Light)</label>
              <span>{config.informationSpeed} px/tk</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={config.informationSpeed}
              onChange={(e) => onConfigChange({ informationSpeed: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[10px] text-slate-500">Lower = Higher Latency / "Relativistic" Effects</p>
          </div>

           <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono uppercase text-emerald-400">
              <label>Perception Radius</label>
              <span>{config.perceptionRadius} px</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              value={config.perceptionRadius}
              onChange={(e) => onConfigChange({ perceptionRadius: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono uppercase text-blue-400">
              <label>Entity Count</label>
              <span>{config.entityCount}</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={config.entityCount}
              onChange={(e) => onConfigChange({ entityCount: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-1">
             <div className="flex justify-between text-xs font-mono uppercase text-purple-400">
              <label>RNG Seed</label>
              <span>{config.seed}</span>
            </div>
             <div className="flex gap-2">
                <input
                  type="number"
                  value={config.seed}
                  onChange={(e) => onConfigChange({ seed: Number(e.target.value) })}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 w-20 focus:outline-none focus:border-purple-500"
                />
                <button 
                  onClick={() => onConfigChange({ seed: Math.floor(Math.random() * 10000) })}
                  className="text-xs bg-slate-800 px-2 rounded border border-slate-700 hover:bg-slate-700 text-slate-400"
                >
                  RANDOMIZE
                </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
