import React, { useRef, useEffect } from 'react';
import { EngineState } from './types';
import { initState, step } from './src/engine/sim';
import { render } from './src/engine/render';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use const stateRef = useRef<EngineState>(...) and mutate only stateRef.current.
  const stateRef = useRef<EngineState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    // Handle Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!stateRef.current) {
        stateRef.current = initState(canvas.width, canvas.height);
      } else {
        stateRef.current.width = canvas.width;
        stateRef.current.height = canvas.height;
      }
    };
    window.addEventListener('resize', resize);
    resize(); // Initial sizing

    let animationFrameId: number;

    // Use performance.now() in the rAF loop (const now = performance.now()), never Date.now().
    let lastTime = performance.now();

    // Implement fixed timestep accumulator with these exact identifiers:
    const FIXED_DT = 1 / 60;
    let accumulator = 0;

    const loop = () => {
      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      lastTime = now;

      // Cap dt to prevent spiral of death if tab is backgrounded
      if (dt > 0.25) dt = 0.25;

      accumulator += dt;

      if (stateRef.current) {
        // while (accumulator >= FIXED_DT) { step(FIXED_DT); accumulator -= FIXED_DT; }
        // Note: passing stateRef.current to step as per architecture, but logic matches requirement
        while (accumulator >= FIXED_DT) {
          step(stateRef.current, FIXED_DT);
          accumulator -= FIXED_DT;
        }

        render(ctx, stateRef.current);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    // cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full bg-black cursor-crosshair"
    />
  );
};

export default App;
