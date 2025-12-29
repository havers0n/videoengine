
import React, { useState, useCallback } from 'react';
import { SimConfig } from './types';
import SimulationCanvas from './components/SimulationCanvas';
import { adjustSimulationWithAI } from './services/geminiService';

const DEFAULT_CONFIG: SimConfig = {
  particleCount: 1200,
  noiseScale: 0.005,
  noiseSpeed: 0.001,
  particleSpeed: 1.5,
  particleColor: '#38bdf8', // Light blue
  fieldColor: '#1e293b',    // Slate 800
  trailAlpha: 0.08,
  showField: false,
  fieldResolution: 30,
  strokeWeight: 1,
  hueRotate: false,
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [prompt, setPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleAiAdjust = async () => {
    if (!prompt.trim()) return;
    setIsAiLoading(true);
    try {
      const updates = await adjustSimulationWithAI(prompt, config);
      setConfig(prev => ({ ...prev, ...updates }));
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('AI adjustment failed. Ensure your API_KEY is set.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleParamChange = (key: keyof SimConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* Simulation Layer */}
      <SimulationCanvas config={config} />

      {/* Floating Controls Button (Mobile) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full hover:bg-slate-800 transition-colors md:hidden"
      >
        <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-sliders-h'}`}></i>
      </button>

      {/* Control Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-80 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 p-6 z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
            <i className="fas fa-wind text-white text-xl"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Ethereal Flux
          </h1>
        </div>

        {/* AI Control Section */}
        <section className="mb-8">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">AI Flow Architect</label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Make it look like a neon rainstorm' or 'Slow, deep sea currents'"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all resize-none h-24 placeholder:text-slate-600"
            />
            <button
              onClick={handleAiAdjust}
              disabled={isAiLoading || !prompt}
              className="absolute bottom-3 right-3 p-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-md transition-colors flex items-center justify-center min-w-[36px]"
            >
              {isAiLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
            </button>
          </div>
        </section>

        {/* Manual Parameter Section */}
        <div className="space-y-6">
          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Particles</label>
              <span className="text-xs text-sky-400 font-mono">{config.particleCount}</span>
            </div>
            <input 
              type="range" min="100" max="5000" step="100"
              value={config.particleCount}
              onChange={(e) => handleParamChange('particleCount', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </section>

          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Flow Scale</label>
              <span className="text-xs text-sky-400 font-mono">{(config.noiseScale * 1000).toFixed(1)}</span>
            </div>
            <input 
              type="range" min="0.001" max="0.05" step="0.001"
              value={config.noiseScale}
              onChange={(e) => handleParamChange('noiseScale', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </section>

          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Fluid Speed</label>
              <span className="text-xs text-sky-400 font-mono">{config.particleSpeed.toFixed(1)}</span>
            </div>
            <input 
              type="range" min="0.1" max="5" step="0.1"
              value={config.particleSpeed}
              onChange={(e) => handleParamChange('particleSpeed', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </section>

          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Evolution</label>
              <span className="text-xs text-sky-400 font-mono">{(config.noiseSpeed * 1000).toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="0.01" step="0.0001"
              value={config.noiseSpeed}
              onChange={(e) => handleParamChange('noiseSpeed', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </section>

          <div className="grid grid-cols-2 gap-4">
            <section>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Stroke</label>
              <input 
                type="color" 
                value={config.particleColor}
                onChange={(e) => handleParamChange('particleColor', e.target.value)}
                className="w-full h-8 bg-transparent cursor-pointer"
              />
            </section>
            <section>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Trails</label>
              <input 
                type="range" min="0.01" max="0.5" step="0.01"
                value={config.trailAlpha}
                onChange={(e) => handleParamChange('trailAlpha', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 mt-3"
              />
            </section>
          </div>

          <section className="flex flex-col gap-3 pt-4 border-t border-slate-800">
             <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Visualize Vector Field</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={config.showField}
                  onChange={(e) => handleParamChange('showField', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Prismatic Shift</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={config.hueRotate}
                  onChange={(e) => handleParamChange('hueRotate', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
              </div>
            </label>
          </section>
        </div>

        <footer className="mt-auto pt-10 text-[10px] text-slate-600 uppercase tracking-[2px] text-center">
          Continuous Vector Dynamics &copy; 2024
        </footer>
      </aside>

      {/* Overlay info */}
      <div className="fixed bottom-4 right-6 pointer-events-none text-right hidden sm:block">
        <p className="text-xs text-slate-500 font-mono">
          {config.particleCount} Agents Active | {config.showField ? 'Vector Layer: Enabled' : 'Vector Layer: Hidden'}
        </p>
        <p className="text-[10px] text-slate-700 font-mono mt-1">
          Sampling Noise G(x, y, t)
        </p>
      </div>
    </div>
  );
};

export default App;
