import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CyclicAutomaton } from './engine/CyclicAutomaton';
import SimulationCanvas from './components/SimulationCanvas';
import MetricsChart from './components/MetricsChart';
import { SimulationParams, SimulationMetrics, ObserverState } from './types';

// Palette generation
const generatePalette = (states: number) => {
  const palette = [];
  for (let i = 0; i < states; i++) {
    const hue = (i * 360 / states) % 360;
    palette.push(`hsl(${hue}, 70%, 60%)`);
  }
  return palette;
};

// Hex converter helper for the Canvas component which expects hex usually or we can update it
// Actually, let's keep it simple and return hex strings for the canvas component parser
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const generateHexPalette = (states: number) => {
  const palette = [];
  for (let i = 0; i < 32; i++) { // Generate enough for dynamic growth
    const hue = (i * 360 / Math.max(states, 5)) % 360; 
    palette.push(hslToHex(hue, 75, 50));
  }
  return palette;
};

export default function App() {
  const GRID_SIZE = 120;
  
  // Initial Params
  const initialParams: SimulationParams = {
    range: 1,
    threshold: 1,
    states: 5,
    neighborhood: 'moore'
  };

  // Refs for the engine to avoid React re-renders on every tick
  const engineRef = useRef<CyclicAutomaton>(new CyclicAutomaton(GRID_SIZE, GRID_SIZE, initialParams));
  
  // React State for UI updates (lower frequency)
  const [metricsHistory, setMetricsHistory] = useState<SimulationMetrics[]>([]);
  const [currentParams, setCurrentParams] = useState<SimulationParams>(initialParams);
  const [observerState, setObserverState] = useState<ObserverState>({
    status: 'OBSERVING',
    targetMetric: 'none',
    adjustment: 'none',
    lastActionTick: 0
  });

  // Palette state
  const palette = useMemo(() => generateHexPalette(currentParams.states), [currentParams.states]);

  useEffect(() => {
    let running = true;
    let frameId: number;

    const loop = () => {
      if (!running) return;

      // 1. Step Simulation
      const metrics = engineRef.current.step();

      // 2. Observer Logic (Self-Influence)
      engineRef.current.observeAndAdjust(metrics);

      // 3. Update React State occasionally (every 10 frames) to keep UI responsive
      if (engineRef.current.tick % 5 === 0) {
        setMetricsHistory(prev => {
          const next = [...prev, metrics];
          return next.slice(-60); // Keep last 60 points
        });
        
        // Sync params and observer state for display
        setCurrentParams({ ...engineRef.current.params });
        setObserverState({ ...engineRef.current.observer });
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handleReset = () => {
    engineRef.current = new CyclicAutomaton(GRID_SIZE, GRID_SIZE, initialParams);
    setMetricsHistory([]);
    setCurrentParams(initialParams);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-mono">
      
      {/* Sidebar / HUD */}
      <div className="w-full md:w-80 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur-md z-10 p-4 gap-6 overflow-y-auto">
        <header>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
            AUTOPOIETIC OBSERVER
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic Cyclic Automaton with Meta-Cognition Layer
          </p>
        </header>

        {/* Observer Status */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Observer Status</h2>
          <div className={`p-3 rounded border ${
            observerState.status === 'OBSERVING' ? 'border-blue-500/30 bg-blue-500/10' :
            observerState.status === 'STABILIZING' ? 'border-red-500/30 bg-red-500/10' :
            observerState.status === 'DISRUPTING' ? 'border-yellow-500/30 bg-yellow-500/10' :
            'border-purple-500/30 bg-purple-500/10'
          }`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm">{observerState.status}</span>
              <span className="text-xs opacity-70">Tick: {engineRef.current.tick}</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Action:</span>
                <span className="text-white">{observerState.adjustment}</span>
              </div>
              <div className="flex justify-between">
                <span>Trigger:</span>
                <span className="text-white">{observerState.targetMetric}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Chart */}
        <section className="space-y-2 flex-grow min-h-[160px]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Telemetry</h2>
          <MetricsChart data={metricsHistory} />
          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
            <div className="bg-slate-800 p-1 rounded">
              <div className="text-pink-400 font-bold">{metricsHistory[metricsHistory.length - 1]?.flux.toFixed(3) || "0.00"}</div>
              <div className="text-slate-500">Flux</div>
            </div>
            <div className="bg-slate-800 p-1 rounded">
              <div className="text-sky-400 font-bold">{metricsHistory[metricsHistory.length - 1]?.entropy.toFixed(3) || "0.00"}</div>
              <div className="text-slate-500">Entropy</div>
            </div>
            <div className="bg-slate-800 p-1 rounded">
              <div className="text-green-400 font-bold">{metricsHistory[metricsHistory.length - 1]?.coherence.toFixed(3) || "0.00"}</div>
              <div className="text-slate-500">Coherence</div>
            </div>
          </div>
        </section>

        {/* Current Parameters Display */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Parameters</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-slate-800/50 p-2 rounded flex flex-col">
              <span className="text-slate-500 text-xs">Threshold</span>
              <span className="font-mono text-lg">{currentParams.threshold}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded flex flex-col">
              <span className="text-slate-500 text-xs">Range</span>
              <span className="font-mono text-lg">{currentParams.range}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded flex flex-col">
              <span className="text-slate-500 text-xs">States</span>
              <span className="font-mono text-lg">{currentParams.states}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded flex flex-col">
              <span className="text-slate-500 text-xs">Neighbor Mode</span>
              <span className="font-mono text-xs truncate">{currentParams.neighborhood}</span>
            </div>
          </div>
        </section>

        <button 
          onClick={handleReset}
          className="mt-auto w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm transition-colors"
        >
          Reset Simulation
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-grow relative bg-black flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="aspect-square h-full max-h-[90vh] shadow-2xl shadow-blue-900/20 border border-slate-800 bg-slate-900">
             <SimulationCanvas engine={engineRef.current} colors={palette} />
          </div>
        </div>
        
        {/* Overlay readout */}
        <div className="absolute top-4 right-4 pointer-events-none text-right">
          <div className="text-4xl font-black text-white/10 tracking-tighter">
            TICK {engineRef.current.tick.toString().padStart(6, '0')}
          </div>
        </div>
      </div>
    </div>
  );
}
