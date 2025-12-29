import React, { useEffect, useRef, useState } from 'react';
import { SimulationEngine } from './engine/core';

const SEED = 12345; // Fixed seed for determinism

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Engine
    const engine = new SimulationEngine(canvasRef.current, SEED);
    engineRef.current = engine;
    engine.start();

    // Handle Resize
    const handleResize = () => {
      if (containerRef.current && engineRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        engineRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Play/Pause toggle (doesn't affect state logic, just loop)
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.start();
    } else {
      engineRef.current.stop();
    }
  }, [isPlaying]);

  return (
    <div className="w-full h-screen bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Simulation Container */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Overlay UI */}
      <div className="z-10 absolute top-6 left-6 max-w-sm pointer-events-none select-none">
        <h1 className="text-2xl font-bold text-white tracking-widest mb-2 border-b border-cyan-500 pb-2 inline-block">
          RISK<span className="text-cyan-400">.ENGINE</span>
        </h1>
        <p className="text-xs text-cyan-200/70 font-mono mt-1">
          DETERMINISTIC STRESS SIMULATOR v1.0
        </p>
        <p className="text-xs text-gray-400 font-mono mt-4">
          SYSTEM STATUS: <span className={isPlaying ? "text-green-500" : "text-yellow-500"}>{isPlaying ? "RUNNING" : "PAUSED"}</span>
        </p>
        <p className="text-xs text-gray-500 font-mono mt-1">
          DT: 1/60s (FIXED)
        </p>
        <div className="mt-4 flex gap-2 pointer-events-auto">
             <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-1 border border-cyan-500/50 text-cyan-400 text-xs hover:bg-cyan-900/30 transition-colors uppercase font-mono"
            >
                {isPlaying ? "HALT" : "RESUME"}
            </button>
             <button 
                onClick={() => window.location.reload()}
                className="px-4 py-1 border border-red-500/50 text-red-400 text-xs hover:bg-red-900/30 transition-colors uppercase font-mono"
            >
                RESET
            </button>
        </div>
      </div>

       <div className="z-10 absolute bottom-6 right-6 text-right pointer-events-none select-none">
        <div className="flex flex-col gap-1 items-end text-[10px] text-gray-600 font-mono">
            <span>CLUSTER_COUNT: 8</span>
            <span>INTEGRATOR: VERLET</span>
            <span>RENDER: CANVAS 2D</span>
        </div>
      </div>
    </div>
  );
};

export default App;