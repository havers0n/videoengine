import React from 'react';
import { EngineConfig } from '../engine/types';

interface ControlPanelProps {
  config: EngineConfig;
  onConfigChange: (c: EngineConfig) => void;
  onReset: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ config, onConfigChange, onReset }) => {
  
  const handleChange = (key: keyof EngineConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-widest">
          Parameters
        </h2>
        <button 
          onClick={onReset}
          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-bold rounded transition-colors"
        >
          RESET STATE
        </button>
      </div>

      <div className="space-y-5">
        <Slider 
          label="Particle Count"
          value={config.particleCount}
          min={100}
          max={5000}
          step={100}
          onChange={(v) => handleChange('particleCount', v)}
        />
        <Slider 
          label="Gravity Well"
          value={config.gravityStrength}
          min={0}
          max={10000}
          step={100}
          onChange={(v) => handleChange('gravityStrength', v)}
        />
        <Slider 
          label="Swirl Force"
          value={config.swirlStrength}
          min={-2000}
          max={2000}
          step={50}
          onChange={(v) => handleChange('swirlStrength', v)}
        />
        <Slider 
          label="Damping"
          value={config.damping}
          min={0.90}
          max={1.0}
          step={0.001}
          displayFormat={(v) => v.toFixed(3)}
          onChange={(v) => handleChange('damping', v)}
        />
        <Slider 
          label="Time Scale"
          value={config.timeScale}
          min={0.1}
          max={3.0}
          step={0.1}
          onChange={(v) => handleChange('timeScale', v)}
        />
      </div>

      <div className="mt-6 pt-6 border-t border-slate-700 text-slate-500 text-xs leading-relaxed">
        <p className="mb-2 font-semibold text-slate-400">Deterministic Behavior</p>
        <p>
          Initial state is generated using a Fermat spiral formula. 
          There is no random number generation. Resetting creates 
          the exact same initial condition every time.
        </p>
      </div>
    </div>
  );
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  displayFormat?: (val: number) => string;
}> = ({ label, value, min, max, step, onChange, displayFormat }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs font-medium text-slate-400">
        <label>{label}</label>
        <span className="font-mono text-cyan-400">
          {displayFormat ? displayFormat(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      />
    </div>
  );
};