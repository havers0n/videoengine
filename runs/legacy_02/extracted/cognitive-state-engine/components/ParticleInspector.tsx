import React from 'react';
import { Particle, CognitiveState } from '../types';
import { STATE_COLORS, STATE_DESCRIPTIONS } from '../constants';

interface ParticleInspectorProps {
  particle: Particle | null;
  onClose: () => void;
}

const ParticleInspector: React.FC<ParticleInspectorProps> = ({ particle, onClose }) => {
  if (!particle) return null;

  const barStyle = (value: number, color: string) => ({
    width: `${value * 100}%`,
    backgroundColor: color,
  });

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl p-6 text-sm z-20">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">{particle.text}</h2>
          <span 
            className="text-xs font-mono px-2 py-1 rounded text-slate-900 font-bold"
            style={{ backgroundColor: STATE_COLORS[particle.state] }}
          >
            {particle.state}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>

      <p className="text-slate-300 mb-4 italic text-xs">
        {STATE_DESCRIPTIONS[particle.state]}
      </p>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Confidence</span>
            <span>{(particle.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-300" style={barStyle(particle.confidence, '#4ade80')} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Uncertainty</span>
            <span>{(particle.uncertainty * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-300" style={barStyle(particle.uncertainty, '#facc15')} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Decay</span>
            <span>{(particle.decay * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-300" style={barStyle(particle.decay, '#ef4444')} />
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
        ID: {particle.id.slice(0, 8)}...<br/>
        Age: {particle.age} ticks
      </div>
    </div>
  );
};

export default ParticleInspector;
