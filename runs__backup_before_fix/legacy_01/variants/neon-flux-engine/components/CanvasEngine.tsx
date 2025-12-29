import React, { useEffect, useRef } from 'react';
import { DeterministicRNG } from '../utils/rng';
import { GameState, Particle, EngineConfig } from '../utils/types';

// Engine Configuration Constants
const FIXED_TIMESTEP = 1 / 120; // 120hz physics update
const MAX_FRAME_TIME = 0.25; // Cap frame time to prevent spiral of death
const CONFIG: EngineConfig = {
  particleCount: 150,
  connectionDistance: 100,
  trailLength: 10,
  friction: 0.99, // Velocity damping
  mouseRepelForce: 500,
  mouseRepelRadius: 150,
};

const CanvasEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);

  // Mutable State Reference - NO React State inside loop
  const stateRef = useRef<GameState>({
    particles: [],
    width: 0,
    height: 0,
    mouse: { x: -1000, y: -1000 },
    isMouseDown: false,
    frameCount: 0,
    lastFpsUpdate: 0,
    currentFps: 0,
  });

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const accumulatorRef = useRef<number>(0);

  // Initialize State with Deterministic RNG
  const init = (width: number, height: number) => {
    const rng = new DeterministicRNG(12345); // Fixed seed
    const particles: Particle[] = [];

    for (let i = 0; i < CONFIG.particleCount; i++) {
      const hue = rng.range(180, 320); // Cyan to Purple range
      particles.push({
        id: i,
        pos: {
          x: rng.range(0, width),
          y: rng.range(0, height),
        },
        vel: {
          x: rng.range(-50, 50),
          y: rng.range(-50, 50),
        },
        radius: rng.range(2, 4),
        color: `hsl(${hue}, 100%, 50%)`,
        hue: hue,
        trail: [],
      });
    }

    stateRef.current.width = width;
    stateRef.current.height = height;
    stateRef.current.particles = particles;
  };

  const update = (dt: number) => {
    const state = stateRef.current;
    const { width, height, mouse, isMouseDown } = state;

    for (const p of state.particles) {
      // 1. Physics Integration (Euler)
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      // 2. Friction
      p.vel.x *= CONFIG.friction;
      p.vel.y *= CONFIG.friction;

      // 3. Wall Bounce
      if (p.pos.x < p.radius) {
        p.pos.x = p.radius;
        p.vel.x *= -1;
      }
      if (p.pos.x > width - p.radius) {
        p.pos.x = width - p.radius;
        p.vel.x *= -1;
      }
      if (p.pos.y < p.radius) {
        p.pos.y = p.radius;
        p.vel.y *= -1;
      }
      if (p.pos.y > height - p.radius) {
        p.pos.y = height - p.radius;
        p.vel.y *= -1;
      }

      // 4. Mouse Interaction (Hotspot)
      const dx = p.pos.x - mouse.x;
      const dy = p.pos.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < CONFIG.mouseRepelRadius * CONFIG.mouseRepelRadius) {
        const dist = Math.sqrt(distSq);
        const force = (CONFIG.mouseRepelRadius - dist) / CONFIG.mouseRepelRadius;
        const repulsion = isMouseDown ? -force * 5 : force; // Click to attract, hover to repel
        
        // Add force to velocity
        p.vel.x += (dx / dist) * repulsion * CONFIG.mouseRepelForce * dt;
        p.vel.y += (dy / dist) * repulsion * CONFIG.mouseRepelForce * dt;
      }

      // 5. Update Trails
      // Only push trail occasionally to save memory or on every frame depending on trail style
      // Here we just shift efficiently
      p.trail.unshift({ x: p.pos.x, y: p.pos.y });
      if (p.trail.length > CONFIG.trailLength) {
        p.trail.pop();
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, alpha: number) => {
    const state = stateRef.current;
    const { width, height, particles } = state;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Global Styles
    ctx.lineCap = 'round';
    
    // Draw Connections (Threads)
    // Optimization: only check neighbors if using a grid, but O(N^2) is fine for N=150
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        
        // Simple distance check (squared to avoid sqrt)
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const distSq = dx * dx + dy * dy;
        const connectDistSq = CONFIG.connectionDistance * CONFIG.connectionDistance;

        if (distSq < connectDistSq) {
          const dist = Math.sqrt(distSq);
          const opacity = 1 - dist / CONFIG.connectionDistance;
          
          ctx.strokeStyle = `rgba(100, 200, 255, ${opacity * 0.3})`;
          ctx.shadowBlur = 0; // Disable shadow for lines for performance
          ctx.beginPath();
          ctx.moveTo(p1.pos.x, p1.pos.y);
          ctx.lineTo(p2.pos.x, p2.pos.y);
          ctx.stroke();
        }
      }
    }

    // Draw Particles & Trails
    for (const p of particles) {
      // Draw Trail
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.pos.x, p.pos.y);
        for (let i = 0; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = p.color.replace('50%)', '30%)').replace('hsl', 'hsla').replace(')', ', 0.3)');
        ctx.lineWidth = p.radius * 0.5;
        ctx.stroke();
      }

      // Draw Particle
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      
      ctx.beginPath();
      // Interpolation could be added here: pos * alpha + prevPos * (1 - alpha)
      // For this style, direct position is snappy enough
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const animate = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }

    let frameTime = (time - previousTimeRef.current) / 1000;
    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }
    previousTimeRef.current = time;

    accumulatorRef.current += frameTime;

    // Fixed Timestep Accumulator Loop
    while (accumulatorRef.current >= FIXED_TIMESTEP) {
      update(FIXED_TIMESTEP);
      accumulatorRef.current -= FIXED_TIMESTEP;
    }

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Calculate alpha for interpolation if needed (accumulator / FIXED_TIMESTEP)
        const alpha = accumulatorRef.current / FIXED_TIMESTEP;
        draw(ctx, alpha);
      }
    }

    // Update FPS Counter (via DOM, not React State)
    if (fpsRef.current) {
        const now = performance.now();
        if (now - stateRef.current.lastFpsUpdate > 500) {
            stateRef.current.currentFps = Math.round(1 / frameTime);
            stateRef.current.lastFpsUpdate = now;
            fpsRef.current.innerText = `FPS: ${stateRef.current.currentFps} | ENTITIES: ${stateRef.current.particles.length}`;
        }
    }

    stateRef.current.frameCount++;
    requestRef.current = requestAnimationFrame(animate);
  };

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        
        // Re-init particles on resize to fit screen, or just update bounds
        if (stateRef.current.particles.length === 0) {
           init(clientWidth, clientHeight);
        } else {
            stateRef.current.width = clientWidth;
            stateRef.current.height = clientHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loop Setup
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      stateRef.current.mouse.x = e.clientX - rect.left;
      stateRef.current.mouse.y = e.clientY - rect.top;
    }
  };

  const handleMouseDown = () => {
    stateRef.current.isMouseDown = true;
  };

  const handleMouseUp = () => {
    stateRef.current.isMouseDown = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     const rect = canvasRef.current?.getBoundingClientRect();
     if (rect && e.touches.length > 0) {
       stateRef.current.mouse.x = e.touches[0].clientX - rect.left;
       stateRef.current.mouse.y = e.touches[0].clientY - rect.top;
     }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden">
        <canvas
            ref={canvasRef}
            className="block touch-none"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
        />
        <div 
            ref={fpsRef}
            className="absolute top-4 left-4 bg-black/50 text-cyan-400 font-mono text-xs px-2 py-1 rounded pointer-events-none backdrop-blur-sm border border-cyan-900/50 select-none"
        >
            FPS: 0
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs font-sans pointer-events-none text-center">
            Hover to repel • Click/Touch to attract <br/>
            Fixed Timestep (120hz) • Deterministic RNG
        </div>
    </div>
  );
};

export default CanvasEngine;
