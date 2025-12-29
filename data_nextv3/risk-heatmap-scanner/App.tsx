import React, { useEffect, useRef } from 'react';
import { EngineState } from './src/types';
import { initSimulation, updateSimulation } from './src/engine/sim';
import { render } from './src/engine/render';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EngineState>(null!); // Initialized in useEffect

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!stateRef.current) {
         stateRef.current = initSimulation(canvas.width, canvas.height);
      } else {
         stateRef.current.width = canvas.width;
         stateRef.current.height = canvas.height;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // HARD RULE: Implement fixed timestep accumulator
    const FIXED_DT = 1 / 60;
    let accumulator = 0;
    let frameId: number;
    let lastTime = performance.now(); // HARD RULE: Use performance.now()

    // Wrapper to match strict syntax requirement
    const step = (dt: number) => {
       updateSimulation(stateRef.current, dt);
    };

    const loop = () => {
      const now = performance.now(); // HARD RULE: Use performance.now()
      const frameTime = (now - lastTime) / 1000;
      lastTime = now;
      
      // Cap frameTime to avoid spiral of death on lag spikes
      const safeFrameTime = Math.min(frameTime, 0.25);

      accumulator += safeFrameTime;

      // HARD RULE: Fixed timestep loop
      while (accumulator >= FIXED_DT) { 
        step(FIXED_DT); 
        accumulator -= FIXED_DT; 
      }

      render(ctx, stateRef.current);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 font-mono pointer-events-none select-none">
        RISK_HEATMAP_SCANNER_V2 // SYSTEM_ACTIVE
      </div>
    </div>
  );
};

export default App;