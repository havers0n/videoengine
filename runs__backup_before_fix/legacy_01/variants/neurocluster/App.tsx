import React, { useState } from 'react';
import { Visualizer } from './components/Visualizer';
import { SimulationConfig } from './types';
import { Settings, Info } from 'lucide-react';

const INITIAL_CONFIG: SimulationConfig = {
  particleCount: 800,
  clusterCount: 8,
  connectionDistance: 70,
  clusterAttraction: 0.08,
  globalRepulsion: 0.8,
  friction: 0.96,
  trailFade: 0.2,
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  const [showControls, setShowControls] = useState(true);

  const updateConfig = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white font-sans select-none">
      <Visualizer config={config} />

      {/* Control Panel Toggle */}
      <button 
        onClick={() => setShowControls(!showControls)}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all z-20"
      >
        <Settings size={20} />
      </button>

      {/* Controls */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 p-6 transform transition-transform duration-300 ease-in-out z-10 overflow-y-auto ${showControls ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mt-12 space-y-8">
          
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              NeuroCluster
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Real-time spatial clustering simulation. Particles form dynamic neural-like groups based on localized cohesion and global repulsion.
            </p>
          </div>

          <div className="space-y-6">
            <ControlGroup label="System">
                <Slider 
                  label="Particles" 
                  value={config.particleCount} 
                  min={100} max={2000} step={50}
                  onChange={(v) => updateConfig('particleCount', v)} 
                />
                <Slider 
                  label="Trail Fade" 
                  value={config.trailFade} 
                  min={0.05} max={1} step={0.05}
                  onChange={(v) => updateConfig('trailFade', v)} 
                />
            </ControlGroup>

            <ControlGroup label="Physics">
                <Slider 
                  label="Connection Dist" 
                  value={config.connectionDistance} 
                  min={30} max={150} 
                  onChange={(v) => updateConfig('connectionDistance', v)} 
                />
                <Slider 
                  label="Cluster Pull" 
                  value={config.clusterAttraction} 
                  min={0.01} max={0.5} step={0.01}
                  onChange={(v) => updateConfig('clusterAttraction', v)} 
                />
                <Slider 
                  label="Global Repel" 
                  value={config.globalRepulsion} 
                  min={0.1} max={5.0} step={0.1}
                  onChange={(v) => updateConfig('globalRepulsion', v)} 
                />
                <Slider 
                  label="Friction" 
                  value={config.friction} 
                  min={0.80} max={0.99} step={0.01}
                  onChange={(v) => updateConfig('friction', v)} 
                />
            </ControlGroup>
          </div>
          
          <div className="pt-8 border-t border-white/10 text-xs text-gray-500 flex items-center gap-2">
            <Info size={14} />
            <span>Built with Spatial Hashing & Fixed Timestep</span>
          </div>

        </div>
      </div>
    </div>
  );
};

const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</h3>
    {children}
  </div>
);

const Slider: React.FC<{ 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step?: number;
  onChange: (val: number) => void 
}> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="group">
    <div className="flex justify-between text-sm mb-1 text-gray-300 group-hover:text-white transition-colors">
      <span>{label}</span>
      <span className="font-mono text-xs opacity-70">{value.toFixed(step < 0.1 ? 2 : 0)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:bg-gray-600 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
    />
  </div>
);

export default App;