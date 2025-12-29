import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EngineConfig, WorldState, Particle, Hotspot } from '../types';
import { createRNG, randomRange, randomColor } from '../utils/rng';

const DEFAULT_CONFIG: EngineConfig = {
  fixedTimeStep: 1 / 120, // 120hz physics calculation for stability
  particleCount: 120,
  connectionDistance: 100,
  trailFade: 0.15,
};

const CanvasEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [seed, setSeed] = useState<number>(12345);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  
  // Stats for display (using ref to avoid re-renders during loop, state for UI update interval)
  const statsRef = useRef({ fps: 0, frameCount: 0, lastFpsTime: 0 });
  const [displayStats, setDisplayStats] = useState({ fps: 0, time: 0 });

  // Core Engine State (Refs to avoid React Reactivity overhead in RAF)
  const stateRef = useRef<WorldState>({
    width: 0,
    height: 0,
    particles: [],
    hotspots: [],
    time: 0,
  });

  const timingRef = useRef({
    accumulator: 0,
    lastTime: 0,
  });

  // --- Initialization ---

  const initWorld = useCallback((currentSeed: number, width: number, height: number) => {
    const rng = createRNG(currentSeed);
    
    // Create Particles
    const particles: Particle[] = [];
    for (let i = 0; i < DEFAULT_CONFIG.particleCount; i++) {
      particles.push({
        id: i,
        pos: { x: randomRange(rng, 0, width), y: randomRange(rng, 0, height) },
        vel: { x: randomRange(rng, -1, 1) * 50, y: randomRange(rng, -1, 1) * 50 },
        radius: randomRange(rng, 2, 5),
        color: randomColor(rng, 80, 60),
        baseSpeed: randomRange(rng, 0.5, 1.5),
      });
    }

    // Create Hotspots (Gradients that move)
    const hotspots: Hotspot[] = [];
    for (let i = 0; i < 3; i++) {
      hotspots.push({
        pos: { x: randomRange(rng, 0, width), y: randomRange(rng, 0, height) },
        vel: { x: randomRange(rng, -1, 1) * 20, y: randomRange(rng, -1, 1) * 20 },
        radius: randomRange(rng, 150, 300),
        intensity: randomRange(rng, 0.5, 1.0),
        colorStart: `hsla(${Math.floor(rng() * 360)}, 70%, 50%, 0.1)`,
        colorEnd: `hsla(${Math.floor(rng() * 360)}, 70%, 50%, 0)`,
      });
    }

    stateRef.current = {
      width,
      height,
      particles,
      hotspots,
      time: 0,
    };

    timingRef.current = {
      accumulator: 0,
      lastTime: performance.now(),
    };
  }, []);

  // --- Physics Step (Fixed Timestep) ---

  const step = (dt: number) => {
    const state = stateRef.current;
    const { width, height, particles, hotspots } = state;

    state.time += dt;

    // Update Hotspots
    for (const spot of hotspots) {
      spot.pos.x += spot.vel.x * dt;
      spot.pos.y += spot.vel.y * dt;

      // Bounce hotspots
      if (spot.pos.x < 0 || spot.pos.x > width) spot.vel.x *= -1;
      if (spot.pos.y < 0 || spot.pos.y > height) spot.vel.y *= -1;
    }

    // Update Particles
    for (const p of particles) {
      // Apply Velocity
      p.pos.x += p.vel.x * dt * p.baseSpeed;
      p.pos.y += p.vel.y * dt * p.baseSpeed;

      // Influence by Hotspots (Attraction/Repulsion logic)
      for (const spot of hotspots) {
        const dx = spot.pos.x - p.pos.x;
        const dy = spot.pos.y - p.pos.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = spot.radius * spot.radius;

        if (distSq < radiusSq) {
          // Gentle spiral/orbit force
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / spot.radius) * 100 * dt;
          
          p.vel.x += (dx / dist) * force * 0.5; 
          p.vel.y += (dy / dist) * force * 0.5;
        }
      }

      // Drag/Damping to prevent infinite acceleration
      p.vel.x *= 0.995;
      p.vel.y *= 0.995;

      // Keep minimum movement
      const speedSq = p.vel.x * p.vel.x + p.vel.y * p.vel.y;
      if (speedSq < 100) {
          // Nudge if too slow
          p.vel.x *= 1.05;
          p.vel.y *= 1.05;
      }

      // Boundary Wrap-around or Bounce? Let's Bounce.
      if (p.pos.x < p.radius) { p.pos.x = p.radius; p.vel.x *= -1; }
      if (p.pos.x > width - p.radius) { p.pos.x = width - p.radius; p.vel.x *= -1; }
      if (p.pos.y < p.radius) { p.pos.y = p.radius; p.vel.y *= -1; }
      if (p.pos.y > height - p.radius) { p.pos.y = height - p.radius; p.vel.y *= -1; }
    }
  };

  // --- Render ---

  const render = (ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    const { width, height, particles, hotspots } = state;

    // Trails effect: Draw a semi-transparent rectangle instead of clearing
    ctx.fillStyle = `rgba(15, 23, 42, ${DEFAULT_CONFIG.trailFade})`; // Slate-900 background equivalent
    ctx.fillRect(0, 0, width, height);

    // Draw Hotspots (Background glow)
    for (const spot of hotspots) {
      const gradient = ctx.createRadialGradient(
        spot.pos.x, spot.pos.y, 0,
        spot.pos.x, spot.pos.y, spot.radius
      );
      gradient.addColorStop(0, spot.colorStart);
      gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent end

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(spot.pos.x, spot.pos.y, spot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Connections (Threads)
    ctx.lineWidth = 1;
    const connectDistSq = DEFAULT_CONFIG.connectionDistance * DEFAULT_CONFIG.connectionDistance;

    // Optimization: Standard O(N^2) is fine for N=120. 
    // For larger N, a spatial grid would be needed.
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < connectDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = 1 - dist / DEFAULT_CONFIG.connectionDistance;
          
          ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(p1.pos.x, p1.pos.y);
          ctx.lineTo(p2.pos.x, p2.pos.y);
          ctx.stroke();
        }
      }
    }

    // Draw Particles
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // --- Main Loop ---

  const loop = (currentTime: number) => {
    // 1. Calculate Real Delta Time
    const dtReal = (currentTime - timingRef.current.lastTime) / 1000;
    timingRef.current.lastTime = currentTime;

    // Safety: prevent spiral of death if tab was inactive
    if (dtReal > 0.25) {
      timingRef.current.accumulator = 0; // Skip catching up if lag is huge
    } else {
      timingRef.current.accumulator += dtReal;
    }

    // 2. Physics Update (Fixed Step)
    // acc += dtReal
    // while (acc >= FIXED_DT) step(FIXED_DT); acc -= FIXED_DT
    const fixedDt = DEFAULT_CONFIG.fixedTimeStep;
    while (timingRef.current.accumulator >= fixedDt) {
      step(fixedDt);
      timingRef.current.accumulator -= fixedDt;
    }

    // 3. Render
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) render(ctx);
    }

    // 4. Stats & Loop
    statsRef.current.frameCount++;
    if (currentTime - statsRef.current.lastFpsTime > 1000) {
      setDisplayStats({ 
        fps: statsRef.current.frameCount,
        time: stateRef.current.time 
      });
      statsRef.current.frameCount = 0;
      statsRef.current.lastFpsTime = currentTime;
    }

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  // --- React Lifecycle ---

  useEffect(() => {
    // Handle Window Resize
    const handleResize = () => {
      if (canvasRef.current) {
        const { offsetWidth, offsetHeight } = canvasRef.current.parentElement!;
        canvasRef.current.width = offsetWidth;
        canvasRef.current.height = offsetHeight;
        
        // Re-init world on resize to keep boundaries sane, 
        // OR just update boundaries. Let's re-init to keep deterministic nature simple relative to size.
        initWorld(seed, offsetWidth, offsetHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    return () => window.removeEventListener('resize', handleResize);
  }, [seed, initWorld]);

  useEffect(() => {
    if (isPlaying) {
        // Start Loop
        timingRef.current.lastTime = performance.now();
        requestRef.current = requestAnimationFrame(loop);
    } else if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const handleReset = () => {
     if (canvasRef.current) {
         initWorld(seed, canvasRef.current.width, canvasRef.current.height);
         // Clear canvas immediately to remove trails
         const ctx = canvasRef.current.getContext('2d');
         if(ctx) {
             ctx.fillStyle = 'rgb(15, 23, 42)';
             ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         }
         timingRef.current.accumulator = 0;
         timingRef.current.lastTime = performance.now();
         setDisplayStats(prev => ({ ...prev, time: 0 }));
     }
  };

  const handleNewSeed = () => {
      const newSeed = Math.floor(Math.random() * 100000);
      setSeed(newSeed);
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 flex flex-col overflow-hidden">
      
      {/* Canvas Layer */}
      <div className="flex-grow w-full h-full relative">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-lg border border-slate-700 text-slate-200 shadow-xl max-w-sm">
        <h1 className="text-lg font-bold mb-2 text-cyan-400">Deterministic Engine</h1>
        <p className="text-xs text-slate-400 mb-4">
            Fixed Step: {(DEFAULT_CONFIG.fixedTimeStep * 1000).toFixed(2)}ms
            <br/>
            Accumulator pattern enabled.
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div className="bg-slate-900 p-2 rounded">
                <span className="text-slate-500 block text-xs">FPS</span>
                <span className="font-mono text-green-400">{displayStats.fps}</span>
            </div>
            <div className="bg-slate-900 p-2 rounded">
                <span className="text-slate-500 block text-xs">Sim Time</span>
                <span className="font-mono text-yellow-400">{displayStats.time.toFixed(1)}s</span>
            </div>
        </div>

        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <label className="text-xs uppercase font-bold text-slate-500 w-12">Seed</label>
                <input 
                    type="number" 
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                    className="flex-grow bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono focus:border-cyan-500 outline-none"
                />
                <button 
                    onClick={handleNewSeed}
                    className="p-1 bg-slate-700 hover:bg-slate-600 rounded"
                    title="Randomize Seed"
                >
                   🎲
                </button>
            </div>

            <div className="flex gap-2 mt-2">
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex-1 py-2 rounded font-bold text-sm transition-colors ${
                        isPlaying 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50'
                    }`}
                >
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <button 
                    onClick={handleReset}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm border border-slate-600"
                >
                    RESET
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasEngine;
