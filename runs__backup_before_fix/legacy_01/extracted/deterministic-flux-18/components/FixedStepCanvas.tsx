import React, { useRef, useEffect, useCallback } from 'react';
import { DeterministicRNG } from '../utils/rng';
import { SIMULATION, PHASES, COLORS } from '../constants';
import { Particle, Hotspot } from '../types';

interface FixedStepCanvasProps {
  isPlaying: boolean;
  onComplete: () => void;
  seed: number;
}

export const FixedStepCanvas: React.FC<FixedStepCanvasProps> = ({ isPlaying, onComplete, seed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Refs for simulation state (no React re-renders)
  const stateRef = useRef<{
    lastTime: number;
    accumulator: number;
    totalTime: number;
    particles: Particle[];
    rng: DeterministicRNG;
    width: number;
    height: number;
  }>({
    lastTime: 0,
    accumulator: 0,
    totalTime: 0,
    particles: [],
    rng: new DeterministicRNG(seed),
    width: 0,
    height: 0,
  });

  // Initialize Particles
  const initSimulation = useCallback((width: number, height: number) => {
    const rng = new DeterministicRNG(seed); // Reset RNG with seed
    const particles: Particle[] = [];
    
    for (let i = 0; i < SIMULATION.PARTICLE_COUNT; i++) {
      particles.push({
        id: i,
        pos: { x: rng.range(0, width), y: rng.range(0, height) },
        vel: { x: rng.range(-20, 20), y: rng.range(-20, 20) },
        radius: rng.range(1.5, 3.5),
        color: rng.pick(COLORS.CALM),
        baseSpeed: rng.range(0.5, 1.5),
      });
    }

    stateRef.current = {
      lastTime: performance.now(),
      accumulator: 0,
      totalTime: 0,
      particles,
      rng,
      width,
      height,
    };
  }, [seed]);

  // Physics Update Step
  const update = (dt: number, totalTime: number, width: number, height: number) => {
    const particles = stateRef.current.particles;
    const rng = stateRef.current.rng;

    // Determine Phase
    const isCalm = totalTime < PHASES.CALM.end;
    const isChaos = totalTime >= PHASES.INSTABILITY.start && totalTime < PHASES.INSTABILITY.end;
    const isOrder = totalTime >= PHASES.ORDER.start;

    // Physics Parameters based on phase
    let friction = 0.99;
    let speedMult = 1.0;
    
    if (isCalm) {
      friction = 0.995;
      speedMult = 1.0;
    } else if (isChaos) {
      friction = 1.001; // Slight acceleration (instability)
      speedMult = 3.0;
    } else if (isOrder) {
      friction = 0.92; // Heavy damping
      speedMult = 0.5;
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // Update Particles
    for (const p of particles) {
      // 1. Apply Forces
      if (isCalm) {
        // Gentle drift
        p.vel.x += rng.range(-0.5, 0.5);
        p.vel.y += rng.range(-0.5, 0.5);
      } else if (isChaos) {
        // Chaos: Random impulses + noise-like jitter
        p.vel.x += rng.range(-2, 2);
        p.vel.y += rng.range(-2, 2);
        
        // Change color randomly in chaos
        if (rng.next() > 0.95) p.color = rng.pick(COLORS.CHAOS);
      } else if (isOrder) {
        // Order: Pull to center or formation
        const dx = centerX - p.pos.x;
        const dy = centerY - p.pos.y;
        const distSq = dx*dx + dy*dy;
        const force = 500 / (distSq + 1000); // Inverse square-ish attraction
        
        p.vel.x += dx * force * 0.5;
        p.vel.y += dy * force * 0.5;

        // Spiral effect
        p.vel.x += -dy * 0.01; 
        p.vel.y += dx * 0.01;

        if (rng.next() > 0.9) p.color = rng.pick(COLORS.ORDER);
      }

      // 2. Integrate Velocity
      p.pos.x += p.vel.x * dt * 60; // Normalize to approx 60fps scale for logic
      p.pos.y += p.vel.y * dt * 60;

      // 3. Apply Friction/Damping
      p.vel.x *= friction;
      p.vel.y *= friction;

      // 4. Boundary Handling (Wrap for Calm/Chaos, Clamp for Order)
      if (isOrder) {
         // Keep strictly inside? Allow some bounce
         if (p.pos.x < 0 || p.pos.x > width) p.vel.x *= -0.8;
         if (p.pos.y < 0 || p.pos.y > height) p.vel.y *= -0.8;
      } else {
        if (p.pos.x < 0) p.pos.x = width;
        if (p.pos.x > width) p.pos.x = 0;
        if (p.pos.y < 0) p.pos.y = height;
        if (p.pos.y > height) p.pos.y = 0;
      }
    }
  };

  // Render Step
  const render = (ctx: CanvasRenderingContext2D, width: number, height: number, totalTime: number) => {
    // 1. Trails (Alpha Fade)
    ctx.fillStyle = `rgba(10, 10, 15, ${SIMULATION.TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);

    const particles = stateRef.current.particles;
    
    // Determine Phase for visual tuning
    const isChaos = totalTime >= PHASES.INSTABILITY.start && totalTime < PHASES.INSTABILITY.end;
    const isOrder = totalTime >= PHASES.ORDER.start;

    // 2. Draw Hotspots (Background Glows)
    // Rotating hotspots
    const angle = totalTime * 0.5;
    const hs1X = width/2 + Math.cos(angle) * (width * 0.25);
    const hs1Y = height/2 + Math.sin(angle) * (height * 0.25);
    const hs2X = width/2 + Math.cos(angle + Math.PI) * (width * 0.25);
    const hs2Y = height/2 + Math.sin(angle + Math.PI) * (height * 0.25);

    const drawHotspot = (x: number, y: number, color: string) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 300);
      grad.addColorStop(0, color + '20'); // 20 hex = low alpha
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 300, 0, Math.PI * 2);
      ctx.fill();
    };

    drawHotspot(hs1X, hs1Y, isChaos ? '#F87171' : '#3B82F6');
    drawHotspot(hs2X, hs2Y, isChaos ? '#FBBF24' : '#8B5CF6');

    // 3. Draw Connections (Threads)
    ctx.lineWidth = 0.5;
    const maxDistSq = isChaos ? SIMULATION.CONNECTION_DISTANCE_CHAOS_SQ : SIMULATION.CONNECTION_DISTANCE_SQ;
    
    // Optimization: Only check a subset or nearby? 
    // For 250 particles, 250*250 = 62,500 iterations is fine for JS on desktop.
    // For safety, we can skip some or just do it.
    
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < maxDistSq) {
          const alpha = 1 - (distSq / maxDistSq);
          ctx.moveTo(p1.pos.x, p1.pos.y);
          ctx.lineTo(p2.pos.x, p2.pos.y);
          // We can't change strokeStyle in a single path efficiently for varying alpha
          // But resetting path 1000 times is slow.
          // Compromise: Batch lines, or use single color with low alpha.
        }
      }
    }
    // Render all connections with a unified color for performance, 
    // or batch them. Let's use a subtle white glow.
    ctx.strokeStyle = isChaos ? 'rgba(255, 200, 200, 0.15)' : 'rgba(100, 200, 255, 0.1)';
    if (isOrder) ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // 4. Draw Particles
    ctx.shadowBlur = isChaos ? 15 : 8;
    for (const p of particles) {
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * (isChaos ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0; // Reset
  };

  // Main Loop
  const loop = useCallback(() => {
    if (!isPlaying) return;

    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
    if (!ctx) return;

    const now = performance.now();
    let frameTime = (now - state.lastTime) / 1000;
    state.lastTime = now;

    // Safety clamp for spirals of death (e.g., tab backgrounding)
    if (frameTime > SIMULATION.MAX_FRAME_TIME) {
      frameTime = SIMULATION.MAX_FRAME_TIME;
    }

    state.accumulator += frameTime;

    // Fixed Update Steps
    while (state.accumulator >= SIMULATION.FIXED_TIMESTEP) {
      update(SIMULATION.FIXED_TIMESTEP, state.totalTime, state.width, state.height);
      state.totalTime += SIMULATION.FIXED_TIMESTEP;
      state.accumulator -= SIMULATION.FIXED_TIMESTEP;

      // Check for completion
      if (state.totalTime >= SIMULATION.DURATION_SECONDS) {
        onComplete();
        return; // Stop loop
      }
    }

    // Render Interpolation could go here, but simple render state is enough for this style
    render(ctx, state.width, state.height, state.totalTime);

    requestRef.current = requestAnimationFrame(loop);
  }, [isPlaying, onComplete]);

  // Initial Setup & Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width, height } = entries[0].contentRect;
      
      canvas.width = width;
      canvas.height = height;
      
      // If first run or resize reset needed
      if (stateRef.current.particles.length === 0 || width !== stateRef.current.width) {
         initSimulation(width, height);
      } else {
        stateRef.current.width = width;
        stateRef.current.height = height;
      }
    });

    if (container) resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [initSimulation]);

  // Start/Stop Loop
  useEffect(() => {
    if (isPlaying) {
      stateRef.current.lastTime = performance.now();
      requestRef.current = requestAnimationFrame(loop);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, loop]);

  // Reset Trigger
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
       initSimulation(canvas.width, canvas.height);
    }
  }, [seed, initSimulation]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block touch-none"
    />
  );
};