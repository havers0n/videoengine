import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PhysicsEngine } from '../services/engine';
import { SimulationConfig } from '../types';

interface VisualizerProps {
  config: SimulationConfig;
}

export const Visualizer: React.FC<VisualizerProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const requestRef = useRef<number>();
  const [stats, setStats] = useState({ fps: 0, particleCount: 0 });
  const fpsTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  // Initialize Engine
  useEffect(() => {
    // Seed 42 for deterministic initial state
    engineRef.current = new PhysicsEngine(42, config);
    
    // Initial Resize
    if (canvasRef.current && engineRef.current) {
        const { clientWidth, clientHeight } = canvasRef.current;
        engineRef.current.resize(clientWidth, clientHeight);
        engineRef.current.initParticles();
    }
    
    return () => {
        engineRef.current = null;
    };
  }, []); // Run once on mount to create engine, we update config via separate effect

  // Handle Resize
  useEffect(() => {
      const handleResize = () => {
          if (canvasRef.current && engineRef.current) {
             engineRef.current.resize(window.innerWidth, window.innerHeight);
          }
      };
      window.addEventListener('resize', handleResize);
      handleResize(); // call immediately
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Re-init particles if critical config changes (like count)
  useEffect(() => {
      if (engineRef.current) {
          // Simplification: Just re-init particles if count changes largely, 
          // usually we would add/remove dynamically but full reset is cleaner for this demo
          if (engineRef.current.particles.length !== config.particleCount) {
              engineRef.current.initParticles(); 
          }
      }
  }, [config.particleCount]);

  // Main Game Loop
  const loop = useCallback((time: number) => {
    if (!canvasRef.current || !engineRef.current) return;

    const engine = engineRef.current;
    const ctx = canvasRef.current.getContext('2d', { alpha: false }); // alpha false for perf
    if (!ctx) return;

    // Fixed Timestep Logic
    const dt = 1 / 120; // 120hz physics
    // Using a simple accumulator in the loop context
    // Note: We use the engine's internal update for physics
    
    // Performance stats
    if (time - fpsTimeRef.current > 1000) {
        setStats({ 
            fps: frameCountRef.current, 
            particleCount: engine.particles.length 
        });
        fpsTimeRef.current = time;
        frameCountRef.current = 0;
    }
    frameCountRef.current++;

    // Clear Screen with Fade for Trails
    ctx.fillStyle = `rgba(5, 5, 5, ${config.trailFade})`;
    ctx.fillRect(0, 0, engine.width, engine.height);

    // Run Physics (Fixed Step 1/120 approx)
    // For 60hz display, we might run update twice.
    // For simplicity and smoothness in React, we just run one heavy step or adaptive steps.
    // Let's implement strict accumulator for consistency.
    
    if (!engineRef.current['lastTime']) engineRef.current['lastTime'] = time;
    let frameTime = (time - engineRef.current['lastTime']) / 1000;
    if (frameTime > 0.25) frameTime = 0.25; // Spiral of death protection
    engineRef.current['lastTime'] = time;

    engineRef.current['accumulator'] = (engineRef.current['accumulator'] || 0) + frameTime;

    while (engineRef.current['accumulator'] >= dt) {
        engine.update(dt);
        engineRef.current['accumulator'] -= dt;
    }

    // Render
    const alpha = engineRef.current['accumulator'] / dt;
    engine.draw(ctx, alpha);

    requestRef.current = requestAnimationFrame(loop);
  }, [config.trailFade]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return (
    <div className="relative w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        width={window.innerWidth}
        height={window.innerHeight}
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 pointer-events-none text-xs font-mono text-white/50 space-y-1">
        <div>FPS: {stats.fps}</div>
        <div>Particles: {stats.particleCount}</div>
        <div>SpatialHash: Active</div>
      </div>
    </div>
  );
};