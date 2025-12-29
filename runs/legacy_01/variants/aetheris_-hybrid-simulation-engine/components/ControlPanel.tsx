
import React from 'react';
import { SimulationConfig } from '../types';
import { Settings, Zap, Users, Wind, Activity } from 'lucide-react';

interface ControlPanelProps {
  config: SimulationConfig;
  onChange: (newConfig: Partial<SimulationConfig>) => void;
  onReset: () => void;
  observation: string;
  isAnalyzing: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onChange, onReset, observation, isAnalyzing }) => {
  return (
    <div className="fixed left-6 top-6 bottom-6 w-80 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 overflow-y-auto text-slate-100 flex flex-col gap-6 shadow-2xl z-50">
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
        <Activity className="text-cyan-400" size={24} />
        <h1 className="font-bold text-xl tracking-tight">Aetheris <span className="text-xs font-normal text-slate-500 block">v1.0 Hybrid Engine</span></h1>
      </div>

      <div className="space-y-6 flex-1">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
            <Zap size={16} /> CORE PHYSICS
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label>Particle Density</label>
              <span className="text-slate-400">{config.particleCount}</span>
            </div>
            <input 
              type="range" min="20" max="300" step="10"
              value={config.particleCount}
              onChange={(e) => onChange({ particleCount: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label>Attraction Force</label>
              <span className="text-slate-400">{config.attractionForce.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.01" max="1" step="0.01"
              value={config.attractionForce}
              onChange={(e) => onChange({ attractionForce: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
            <Wind size={16} /> NOISE MODULATION
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label>Entropy Injection</label>
              <span className="text-slate-400">{config.noiseIntensity.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="5" step="0.1"
              value={config.noiseIntensity}
              onChange={(e) => onChange({ noiseIntensity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
            <Users size={16} /> CLUSTERING
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label>Sync Radius</label>
              <span className="text-slate-400">{config.clusteringRadius}px</span>
            </div>
            <input 
              type="range" min="20" max="250" step="5"
              value={config.clusteringRadius}
              onChange={(e) => onChange({ clusteringRadius: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </section>
      </div>

      <div className="mt-auto space-y-4">
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1">
            <Activity size={10} /> AI Observer Report
          </p>
          <p className={`text-xs italic leading-relaxed text-slate-300 transition-opacity duration-500 ${isAnalyzing ? 'opacity-50' : 'opacity-100'}`}>
            "{observation}"
          </p>
        </div>

        <button 
          onClick={onReset}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Settings size={14} /> Re-seed Simulation
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
