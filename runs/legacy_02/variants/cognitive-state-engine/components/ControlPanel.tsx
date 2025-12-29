import React, { useState } from 'react';
import { SimulationConfig } from '../types';

interface ControlPanelProps {
  config: SimulationConfig;
  onConfigChange: (newConfig: SimulationConfig) => void;
  onInjectThought: (topic: string) => void;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onConfigChange, onInjectThought, isLoading }) => {
  const [topic, setTopic] = useState('');

  const handleChange = (key: keyof SimulationConfig, value: number | boolean) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onInjectThought(topic);
      setTopic('');
    }
  };

  return (
    <div className="absolute top-4 left-4 w-72 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-5 z-20 shadow-xl">
      <h1 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
        Cognitive Engine
      </h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <label className="block text-xs font-medium text-slate-400 mb-1">Inject Semantic Stimulus</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 'Future of AI'"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit" 
            disabled={isLoading || !topic.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            {isLoading ? '...' : 'Add'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div>
          <label className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Learning Rate</span>
            <span>{config.learningRate.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={config.learningRate}
            onChange={(e) => handleChange('learningRate', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Uncertainty Volatility</span>
            <span>{config.uncertaintyVolatility.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="0.0"
            max="0.1"
            step="0.005"
            value={config.uncertaintyVolatility}
            onChange={(e) => handleChange('uncertaintyVolatility', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Decay Rate</span>
            <span>{config.decayRate.toFixed(4)}</span>
          </label>
          <input
            type="range"
            min="0.0001"
            max="0.01"
            step="0.0001"
            value={config.decayRate}
            onChange={(e) => handleChange('decayRate', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="text-xs text-slate-400">Auto-Spawn Thoughts</span>
          <button
            onClick={() => handleChange('autoSpawn', !config.autoSpawn)}
            className={`w-10 h-5 rounded-full relative transition-colors ${config.autoSpawn ? 'bg-green-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${config.autoSpawn ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-[10px] text-slate-500">
        Particles represent cognitive states. Transitions are rule-based, not random.
      </div>
    </div>
  );
};

export default ControlPanel;
