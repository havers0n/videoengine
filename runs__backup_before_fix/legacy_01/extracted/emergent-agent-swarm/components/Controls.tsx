
import React from 'react';
import { SimulationConfig } from '../types';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (newConfig: SimulationConfig) => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({ config, onChange, onReset }) => {
  const handleChange = (key: keyof SimulationConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur-md p-6 rounded-xl border border-slate-700 w-80 shadow-2xl space-y-4">
      <h1 className="text-xl font-bold text-white mb-2">Swarm Parameters</h1>
      
      <div className="space-y-4 text-slate-300 text-sm">
        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Separation (Avoidance)</span>
            <span className="font-mono">{config.separationWeight.toFixed(1)}</span>
          </div>
          <input 
            type="range" min="0" max="5" step="0.1" 
            value={config.separationWeight} 
            onChange={(e) => handleChange('separationWeight', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Alignment (Flocking)</span>
            <span className="font-mono">{config.alignmentWeight.toFixed(1)}</span>
          </div>
          <input 
            type="range" min="0" max="5" step="0.1" 
            value={config.alignmentWeight} 
            onChange={(e) => handleChange('alignmentWeight', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Cohesion (Clustering)</span>
            <span className="font-mono">{config.cohesionWeight.toFixed(1)}</span>
          </div>
          <input 
            type="range" min="0" max="5" step="0.1" 
            value={config.cohesionWeight} 
            onChange={(e) => handleChange('cohesionWeight', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Neighbor Radius</span>
            <span className="font-mono">{config.neighborRadius}px</span>
          </div>
          <input 
            type="range" min="20" max="200" step="5" 
            value={config.neighborRadius} 
            onChange={(e) => handleChange('neighborRadius', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Stress Threshold</span>
            <span className="font-mono">{config.stressThreshold.toFixed(1)}</span>
          </div>
          <input 
            type="range" min="0.1" max="2" step="0.1" 
            value={config.stressThreshold} 
            onChange={(e) => handleChange('stressThreshold', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </label>
      </div>

      <button 
        onClick={onReset}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors mt-2 shadow-lg"
      >
        Re-seed Simulation
      </button>
      
      <div className="text-[10px] text-slate-500 italic mt-4">
        * Red agents are in an ALERT state (high stress).
        * Stress builds up in crowded areas or near alert neighbors.
      </div>
    </div>
  );
};

export default Controls;
