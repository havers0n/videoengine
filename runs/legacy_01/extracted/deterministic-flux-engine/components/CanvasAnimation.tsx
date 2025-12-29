import React, { useEffect, useRef, useState } from 'react';
import { DeterministicRNG } from '../utils/rng';
import { EngineState, Particle, Hotspot } from '../types';
import { CONFIG, COLORS, SEED } from '../constants';

// Helper to keep vector math fast and inline
const distSq = (x1: number, y1: number, x2: number, y2: number) => (x2 - x1) ** 2 + (y2 - y1) ** 2;

interface CanvasAnimationProps {
  onUpdateStats: (time: number, fps: number) => void;
}

export const CanvasAnimation: React.FC<CanvasAnimationProps> = ({ onUpdateStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // StateRef holds the Single Source of Truth for the physics engine.
  // We use a Ref because we need to mutate this 120 times a second without React re-renders.
  const stateRef = useRef<EngineState>({
    t: 0,
    particles: [],
    hotspots: [],
    width: 0,
    height: 0,
  });

  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const rngRef = useRef<DeterministicRNG>(new DeterministicRNG(SEED));
  
  // FPS calculation helpers
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);

  // Initialize the Simulation
  const initEngine = (width: number, height: number) => {
    const rng = new DeterministicRNG(SEED); // Reset RNG on init for determinism
    rngRef.current = rng;

    const particles: Particle[] = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        id: i,
        pos: { x: rng.range(0, width), y: rng.range(0, height) },
        vel: { x: rng.range(-1, 1) * CONFIG.baseSpeed, y: rng.range(-1, 1) * CONFIG.baseSpeed },
        acc: { x: 0, y: 0 },
        life: rng.range(0.5, 1.0),
        maxLife: rng.range(2, 5),
        hue: rng.range(180, 320), // Cyan to Magenta range
        size: rng.range(1.5, 3.5),
      });
    }

    const hotspots: Hotspot[] = [
      { 
        pos: { x: width * 0.3, y: height * 0.5 }, 
        vel: { x: 20, y: 15 },
        radius: 150, 
        strength: 2000, 
        color: COLORS.accent1 
      },
      { 
        pos: { x: width * 0.7, y: height * 0.5 }, 
        vel: { x: -20, y: -10 },
        radius: 180, 
        strength: -2500, // Repulsor
        color: COLORS.accent2 
      },
      {
        pos: { x: width * 0.5, y: height * 0.2 },
        vel: { x: 10, y: 30 },
        radius: 120,
        strength: 1500,
        color: COLORS.accent3
      }
    ];

    stateRef.current = {
      t: 0,
      particles,
      hotspots,
      width,
      height,
    };
    
    // Reset loop control variables
    accumulatorRef.current = 0;
    previousTimeRef.current = performance.now();
  };

  // The Physics Step (Fixed DT)
  const updatePhysics = (dt: number) => {
    const state = stateRef.current;
    
    // Stop updating physics if duration reached, but we still render the static/fading scene
    if (state.t >= CONFIG.duration) return;

    state.t += dt;

    // Update Hotspots
    state.hotspots.forEach(hs => {
      hs.pos.x += hs.vel.x * dt;
      hs.pos.y += hs.vel.y * dt;

      // Bounce hotspots
      if (hs.pos.x < 0 || hs.pos.x > state.width) hs.vel.x *= -1;
      if (hs.pos.y < 0 || hs.pos.y > state.height) hs.vel.y *= -1;
    });

    // Update Particles
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];

      // Reset acceleration
      p.acc.x = 0;
      p.acc.y = 0;

      // Interaction with hotspots
      for (const hs of state.hotspots) {
        const dx = hs.pos.x - p.pos.x;
        const dy = hs.pos.y - p.pos.y;
        const d2 = dx*dx + dy*dy;
        const dist = Math.sqrt(d2);

        if (dist < hs.radius + 100) { // Influence range
          // Normalized force direction
          const fx = dx / dist;
          const fy = dy / dist;
          
          // Force magnitude (inverse square-ish law, clamped)
          const force = (hs.strength / (Math.max(d2, 1000))) * 50; 
          
          p.acc.x += fx * force;
          p.acc.y += fy * force;
        }
      }

      // Apply physics
      p.vel.x += p.acc.x * dt;
      p.vel.y += p.acc.y * dt;
      
      // Drag/Friction to prevent explosion
      p.vel.x *= 0.98;
      p.vel.y *= 0.98;

      // Add some deterministic noise to velocity for organic movement
      const timeScale = state.t * 0.5;
      p.vel.x += Math.sin(p.id * 99 + timeScale) * 20 * dt;
      p.vel.y += Math.cos(p.id * 99 + timeScale) * 20 * dt;

      // Move
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      // Wrap around screen
      if (p.pos.x < 0) p.pos.x += state.width;
      if (p.pos.x > state.width) p.pos.x -= state.width;
      if (p.pos.y < 0) p.pos.y += state.height;
      if (p.pos.y > state.height) p.pos.y -= state.height;

      // Lifecycle (Pulse size)
      p.life -= dt;
      if (p.life <= 0) {
        p.life = p.maxLife;
      }
    }
  };

  // The Render Step (Interpolation could go here, but omitted for style clarity)
  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    
    // 1. Trails Effect: Draw a semi-transparent rectangle over the whole canvas
    // This creates the "fading trail" effect efficiently.
    ctx.fillStyle = 'rgba(2, 6, 23, 0.15)'; // Slate-950 with low opacity
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.globalCompositeOperation = 'lighter'; // Additive blending for neon glow

    // 2. Draw Hotspots (Glows)
    state.hotspots.forEach(hs => {
      const gradient = ctx.createRadialGradient(hs.pos.x, hs.pos.y, 0, hs.pos.x, hs.pos.y, hs.radius);
      gradient.addColorStop(0, hs.color + '44'); // Low alpha hex
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(hs.pos.x, hs.pos.y, hs.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Draw Threads (Lines between close particles)
    ctx.lineWidth = 0.5;
    const connectDistSq = CONFIG.connectionDistance * CONFIG.connectionDistance;
    
    // Optimization: Only check a subset or use spatial partition (Grid) for huge numbers.
    // For < 200 particles, O(N^2) is acceptable (~20k checks) in a high-perf loop.
    for (let i = 0; i < state.particles.length; i++) {
      const p1 = state.particles[i];
      for (let j = i + 1; j < state.particles.length; j++) {
        const p2 = state.particles[j];
        const d2 = distSq(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
        
        if (d2 < connectDistSq) {
          const alpha = 1 - (d2 / connectDistSq);
          ctx.strokeStyle = `hsla(${p1.hue}, 80%, 60%, ${alpha * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(p1.pos.x, p1.pos.y);
          ctx.lineTo(p2.pos.x, p2.pos.y);
          ctx.stroke();
        }
      }
    }

    // 4. Draw Particles
    for (const p of state.particles) {
      // Shadow blur for glow (expensive, so only on particles)
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsla(${p.hue}, 80%, 50%, 0.8)`;
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, 1)`;
      
      const pulse = Math.sin(state.t * 5 + p.id) * 0.5 + 1; // 0.5 to 1.5
      const size = p.size * pulse;

      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0; // Reset for next operations
    }
    
    // 5. End marker if finished
    if (state.t >= CONFIG.duration) {
       ctx.globalCompositeOperation = 'source-over';
       ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Slow fade out to black eventually
       ctx.fillRect(0,0, state.width, state.height);
    }
  };

  // The Main Loop
  const loop = (time: number) => {
    // Calculate delta time
    const deltaTime = (time - previousTimeRef.current) / 1000; // ms to seconds
    previousTimeRef.current = time;

    // Accumulator Loop
    // Cap deltaTime to avoid spiral of death if tab is inactive
    const maxFrameTime = 0.25; 
    accumulatorRef.current += Math.min(deltaTime, maxFrameTime);

    while (accumulatorRef.current >= CONFIG.dt) {
      updatePhysics(CONFIG.dt);
      accumulatorRef.current -= CONFIG.dt;
    }

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false for slight perf boost
      if (ctx) {
         draw(ctx);
      }
    }
    
    // Update Stats (throttled)
    frameCountRef.current++;
    if (time - lastFpsUpdateRef.current > 500) {
        const fps = frameCountRef.current / ((time - lastFpsUpdateRef.current) / 1000);
        onUpdateStats(stateRef.current.t, fps);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = time;
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    // Initial Setup
    const handleResize = () => {
      if (canvasRef.current) {
        // Set actual canvas size to window size for sharp rendering on high DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasRef.current.getBoundingClientRect();
        
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        
        // Re-init engine on resize to keep things sane or just update bounds
        initEngine(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // trigger once

    // Start Loop
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full cursor-crosshair"
      style={{ touchAction: 'none' }}
    />
  );
};