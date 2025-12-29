import React, { useRef, useEffect, useState } from 'react';
import { initSimulation, step, draw } from './engine/sim';
import { SimulationState, FIXED_STEP, TOTAL_DURATION } from './engine/state';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale context to match dpr
    ctx.scale(dpr, dpr);
    const logicalWidth = rect.width;
    const logicalHeight = rect.height;

    // Initialize State (Seed 12345 for deterministic run)
    stateRef.current = initSimulation(logicalWidth, logicalHeight, 12345);

    const animate = (time: number) => {
      if (!stateRef.current) return;
      
      if (previousTimeRef.current === undefined) {
        previousTimeRef.current = time;
      }

      // Calculate delta time in seconds
      const deltaTime = (time - previousTimeRef.current) / 1000;
      previousTimeRef.current = time;

      // Add to accumulator
      stateRef.current.dtAccumulator += deltaTime;

      // Fixed timestep update loop
      // Max 5 steps to prevent spiral of death on lag spikes
      let steps = 0;
      while (stateRef.current.dtAccumulator >= FIXED_STEP && steps < 5) {
        step(stateRef.current);
        stateRef.current.dtAccumulator -= FIXED_STEP;
        steps++;
      }

      // Render
      draw(ctx, stateRef.current);

      // Loop or Finish
      if (stateRef.current.t < TOTAL_DURATION) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setFinished(true);
      }
    };

    // Start loop
    requestRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleRestart = () => {
    setFinished(false);
    previousTimeRef.current = undefined;
    const canvas = canvasRef.current;
    if (canvas) {
       const rect = canvas.getBoundingClientRect();
       stateRef.current = initSimulation(rect.width, rect.height, 12345); // Same seed
       requestRef.current = requestAnimationFrame((t) => {
         // Tiny hack to restart the loop function reference
         const loop = (time: number) => {
           if (!stateRef.current) return;
            if (previousTimeRef.current === undefined) previousTimeRef.current = time;
            const dt = (time - previousTimeRef.current) / 1000;
            previousTimeRef.current = time;
            stateRef.current.dtAccumulator += dt;
            let steps = 0;
            while (stateRef.current.dtAccumulator >= FIXED_STEP && steps < 5) {
              step(stateRef.current);
              stateRef.current.dtAccumulator -= FIXED_STEP;
              steps++;
            }
            const ctx = canvas.getContext('2d');
            if(ctx) draw(ctx, stateRef.current);

            if (stateRef.current.t < TOTAL_DURATION) {
              requestRef.current = requestAnimationFrame(loop);
            } else {
              setFinished(true);
            }
         }
         loop(t);
       });
    }
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center font-mono">
      <div className="absolute top-4 left-4 z-10 text-cyan-500 text-xs opacity-70 pointer-events-none">
        <div>ENGINE: RISK_SCAN_V4</div>
        <div>MODE: DETERMINISTIC</div>
        <div>SEED: 12345</div>
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full max-w-5xl max-h-[80vh] border border-cyan-900/30 rounded-lg shadow-[0_0_50px_rgba(0,255,255,0.1)] bg-neutral-900"
      />

      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
          <div className="text-center p-8 border border-cyan-500/50 bg-black/80 rounded shadow-2xl">
            <h1 className="text-2xl text-cyan-400 mb-2 tracking-widest">SCAN COMPLETE</h1>
            <p className="text-gray-400 text-sm mb-6">Threat Assessment: STABILIZED</p>
            <button 
              onClick={handleRestart}
              className="px-6 py-2 bg-cyan-900/50 hover:bg-cyan-500 hover:text-black text-cyan-300 border border-cyan-500 transition-all uppercase text-sm tracking-wider"
            >
              Re-Initialize Sequence
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
