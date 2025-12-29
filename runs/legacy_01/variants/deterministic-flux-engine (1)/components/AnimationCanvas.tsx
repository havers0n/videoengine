import React, { useEffect, useRef, useState } from 'react';
import { EngineState, DT, MAX_FRAME_TIME, DURATION, Particle, Hotspot } from '../types';
import { createRng, randomRange } from '../utils/rng';

const SEED = 1337;
const PARTICLE_COUNT = 180;
const CONNECTION_DISTANCE = 80;

const AnimationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // The master state of the engine. NO React state updates inside the loop.
  const stateRef = useRef<EngineState>({
    t: 0,
    particles: [],
    hotspots: [],
    rng: createRng(SEED),
    width: 800,
    height: 600,
  });

  // Loop management refs
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const perfRef = useRef<HTMLDivElement>(null); // Direct DOM manipulation for stats

  // --- Physics Logic (Deterministic) ---
  const initEngine = (width: number, height: number) => {
    const rng = createRng(SEED);
    const particles: Particle[] = [];
    
    // Initialize Particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        id: i,
        pos: { x: width * 0.5, y: height * 0.5 }, // Start center
        vel: { 
          x: randomRange(rng, -200, 200), 
          y: randomRange(rng, -200, 200) 
        },
        acc: { x: 0, y: 0 },
        radius: randomRange(rng, 1.5, 3.5),
        hue: randomRange(rng, 160, 320), // Cyan to Magenta range
        life: randomRange(rng, 0, DURATION),
        maxLife: DURATION,
      });
    }

    // Initialize Hotspots (Attractors/Repulsors)
    const hotspots: Hotspot[] = [
      { pos: { x: width * 0.3, y: height * 0.3 }, strength: 1500, radius: 150, orbitSpeed: 0.5, color: '#00ffff' },
      { pos: { x: width * 0.7, y: height * 0.7 }, strength: -1000, radius: 200, orbitSpeed: -0.3, color: '#ff00ff' },
      { pos: { x: width * 0.5, y: height * 0.2 }, strength: 800, radius: 100, orbitSpeed: 0.8, color: '#4444ff' },
    ];

    stateRef.current = {
      t: 0,
      particles,
      hotspots,
      rng,
      width,
      height,
    };
  };

  const update = (dt: number) => {
    const s = stateRef.current;
    s.t += dt;

    // Reset loop if duration exceeded
    if (s.t >= DURATION) {
      initEngine(s.width, s.height);
      return;
    }

    // Update Hotspots
    s.hotspots.forEach((h, i) => {
      const angle = s.t * h.orbitSpeed + (i * (Math.PI * 2) / s.hotspots.length);
      const centerX = s.width / 2;
      const centerY = s.height / 2;
      const radius = Math.min(s.width, s.height) * 0.25;
      
      h.pos.x = centerX + Math.cos(angle) * radius;
      h.pos.y = centerY + Math.sin(angle * 1.3) * radius; // Lissajous-ish movement
    });

    // Update Particles
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];

      // Reset forces
      p.acc.x = 0;
      p.acc.y = 0;

      // Apply forces from hotspots
      for (const h of s.hotspots) {
        const dx = h.pos.x - p.pos.x;
        const dy = h.pos.y - p.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist > 5) { // Avoid singularity
          const force = h.strength / distSq;
          p.acc.x += (dx / dist) * force;
          p.acc.y += (dy / dist) * force;
        }
      }

      // Drag (Air resistance)
      p.acc.x -= p.vel.x * 0.01;
      p.acc.y -= p.vel.y * 0.01;

      // Swirling center force
      const dx = s.width / 2 - p.pos.x;
      const dy = s.height / 2 - p.pos.y;
      p.acc.x += dy * 0.05; // Tangential force
      p.acc.y -= dx * 0.05;

      // Integration (Euler)
      p.vel.x += p.acc.x;
      p.vel.y += p.acc.y;
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      // Bounds (Bounce)
      const buffer = 50;
      if (p.pos.x < -buffer) { p.pos.x = s.width + buffer; }
      if (p.pos.x > s.width + buffer) { p.pos.x = -buffer; }
      if (p.pos.y < -buffer) { p.pos.y = s.height + buffer; }
      if (p.pos.y > s.height + buffer) { p.pos.y = -buffer; }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, alpha: number) => {
    const s = stateRef.current;
    const { width, height } = s;

    // 1. Trails (Alpha Fade)
    // Instead of clearRect, we draw a semi-transparent black rectangle
    ctx.fillStyle = 'rgba(5, 5, 10, 0.15)';
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

    // 2. Draw Threads (Connections)
    // Optimization: Spatial partitioning would be better for massive counts, 
    // but for <200 particles O(N^2) is acceptable in JS on modern devices (~40k checks).
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(50, 150, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < s.particles.length; i++) {
      for (let j = i + 1; j < s.particles.length; j++) {
        const p1 = s.particles[i];
        const p2 = s.particles[j];
        
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
          const dist = Math.sqrt(distSq);
          const opacity = 1 - (dist / CONNECTION_DISTANCE);
          // Manually manipulating path for performance instead of stroke() every line
          ctx.moveTo(p1.pos.x, p1.pos.y);
          ctx.lineTo(p2.pos.x, p2.pos.y);
        }
      }
    }
    ctx.stroke();

    // 3. Draw Hotspots (Radial Gradients)
    s.hotspots.forEach(h => {
      const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, h.radius);
      grad.addColorStop(0, h.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw Particles
    s.particles.forEach(p => {
      // Color cycling based on velocity + time
      const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
      const hue = (p.hue + s.t * 20 + speed) % 360;
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsla(${hue}, 80%, 60%, 1)`;
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 1)`;
      
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.shadowBlur = 0; // Reset
    ctx.globalCompositeOperation = 'source-over';

    // 5. Draw Progress Ring (UI)
    const progress = s.t / DURATION;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width - 40, 40, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(width - 40, 40, 20, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
    ctx.stroke();
  };

  // --- Loop Boilerplate ---
  const tick = (currentTime: number) => {
    // Initialize lastTime on first frame
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }

    // Convert ms to seconds
    let frameTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    // Spiral of death protection
    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    accumulatorRef.current += frameTime;

    // Fixed Update Loop
    while (accumulatorRef.current >= DT) {
      update(DT);
      accumulatorRef.current -= DT;
    }

    // Render Interpolation alpha (optional, passed to draw but not fully utilized in this particle logic for simplicity)
    const alpha = accumulatorRef.current / DT;

    // Drawing
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx, alpha);
      }
    }

    // Update Stats DOM without React render
    if (perfRef.current) {
      perfRef.current.innerText = `T: ${stateRef.current.t.toFixed(2)}s | Entities: ${stateRef.current.particles.length}`;
    }

    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Initial Setup
    const { clientWidth, clientHeight } = containerRef.current;
    canvasRef.current.width = clientWidth;
    canvasRef.current.height = clientHeight;
    initEngine(clientWidth, clientHeight);

    // Start Loop
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(tick);

    const handleResize = () => {
        if (!containerRef.current || !canvasRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        stateRef.current.width = clientWidth;
        stateRef.current.height = clientHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div 
        ref={perfRef} 
        className="absolute top-4 left-4 font-mono text-xs text-green-400 pointer-events-none select-none"
      >
        Initializing...
      </div>
    </div>
  );
};

export default AnimationCanvas;
