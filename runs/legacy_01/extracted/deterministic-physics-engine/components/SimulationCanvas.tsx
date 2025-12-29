import React, { useRef, useEffect, useState } from 'react';
import { EngineConfig, RenderStats } from '../engine/types';
import { SimulationEngine } from '../engine/SimulationEngine';

interface SimulationCanvasProps {
  config: EngineConfig;
  onEngineMount: (engine: { reset: () => void }) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ config, onEngineMount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<RenderStats>({ fps: 0, particleCount: 0, physicsTime: 0 });

  // Initialize Engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new SimulationEngine(config);
      onEngineMount(engineRef.current);
    }
  }, [onEngineMount, config]); // Config is initial only here really, updated via effect below

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current && engineRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }

        engineRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Config
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
  }, [config]);

  // Start Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;

    if (canvas && engine) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        engine.start(ctx);
      }
    }
    
    return () => {
      engine?.stop();
    };
  }, []);

  // Poll for stats (decoupled from render loop to avoid React thrashing)
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        setStats({ ...engineRef.current.stats });
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-900 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD Overlay */}
      <div className="absolute bottom-4 left-4 p-3 bg-slate-900/80 backdrop-blur rounded border border-slate-700 font-mono text-xs text-slate-300 pointer-events-none select-none">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <span className="text-slate-500">FPS:</span>
          <span className={stats.fps < 55 ? "text-red-400" : "text-green-400"}>{stats.fps}</span>
          
          <span className="text-slate-500">PARTICLES:</span>
          <span>{stats.particleCount}</span>
          
          <span className="text-slate-500">PHYSICS TIME:</span>
          <span>{stats.physicsTime.toFixed(2)}ms</span>
        </div>
      </div>
    </div>
  );
};