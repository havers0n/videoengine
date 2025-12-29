import React, { useRef, useEffect, useCallback } from 'react';
import { DeterministicRNG } from '../utils/rng';
import { EngineState, Particle, Hotspot } from '../types';

// --- Constants ---
const PHYSICS_DT = 1000 / 120; // 120Hz updates (~8.33ms)
const MAX_PARTICLES = 120;
const CONNECTION_DIST = 100;
const DURATION_CYCLE = 18000; // 18 seconds loop
const SEED = 12345;

const CanvasLoop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State is kept entirely in refs to avoid React re-renders during the loop
  const stateRef = useRef<EngineState>({
    particles: [],
    hotspots: [],
    width: 0,
    height: 0,
    time: 0,
  });

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const accumulatorRef = useRef<number>(0);

  // --- Initialization ---
  const initEngine = useCallback((width: number, height: number) => {
    const rng = new DeterministicRNG(SEED);
    const particles: Particle[] = [];
    const hotspots: Hotspot[] = [];

    // Create Particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        id: i,
        pos: { x: rng.range(0, width), y: rng.range(0, height) },
        vel: { x: rng.range(-1, 1), y: rng.range(-1, 1) },
        radius: rng.range(1.5, 3.5),
        hue: rng.range(180, 260), // Blue-ish range
        life: rng.next(),
        maxLife: rng.range(2000, 5000),
      });
    }

    // Create Hotspots (Gravity/Repulsion centers)
    for (let i = 0; i < 3; i++) {
      hotspots.push({
        pos: { x: rng.range(width * 0.2, width * 0.8), y: rng.range(height * 0.2, height * 0.8) },
        vel: { x: rng.range(-0.5, 0.5), y: rng.range(-0.5, 0.5) },
        radius: rng.range(150, 300),
        hue: i === 0 ? 320 : i === 1 ? 200 : 40, // Magenta, Cyan, Gold
      });
    }

    stateRef.current = {
      particles,
      hotspots,
      width,
      height,
      time: 0,
    };
  }, []);

  // --- Physics Update (Fixed Step) ---
  const update = (dt: number) => {
    const state = stateRef.current;
    const { width, height, particles, hotspots } = state;
    
    // Cycle progress (0 to 1) over 18 seconds
    const cycle = (state.time % DURATION_CYCLE) / DURATION_CYCLE;
    
    // Global flow forces change based on 18s cycle
    // 0-0.5: Expansion/Chaos, 0.5-1.0: Contraction/Order
    const globalSpeedMult = 1 + Math.sin(cycle * Math.PI * 2) * 0.5;

    // Update Hotspots
    hotspots.forEach(h => {
      h.pos.x += h.vel.x * dt * 0.05;
      h.pos.y += h.vel.y * dt * 0.05;

      // Bounce hotspots
      if (h.pos.x < 0 || h.pos.x > width) h.vel.x *= -1;
      if (h.pos.y < 0 || h.pos.y > height) h.vel.y *= -1;
    });

    // Update Particles
    particles.forEach(p => {
      // Basic movement
      p.pos.x += p.vel.x * (dt * 0.06 * globalSpeedMult);
      p.pos.y += p.vel.y * (dt * 0.06 * globalSpeedMult);

      // Interaction with hotspots
      hotspots.forEach(h => {
        const dx = p.pos.x - h.pos.x;
        const dy = p.pos.y - h.pos.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = h.radius * h.radius;

        if (distSq < radiusSq) {
          const force = (1 - distSq / radiusSq) * 0.002 * dt;
          // Swirl effect
          p.vel.x += -dy * force * 0.1;
          p.vel.y += dx * force * 0.1;
          
          // Color influence
          if (Math.random() < 0.05) {
             p.hue = (p.hue * 0.95 + h.hue * 0.05);
          }
        }
      });

      // Wall bounce
      if (p.pos.x < 0 || p.pos.x > width) p.vel.x *= -1;
      if (p.pos.y < 0 || p.pos.y > height) p.vel.y *= -1;

      // Keep inside (safety)
      p.pos.x = Math.max(0, Math.min(width, p.pos.x));
      p.pos.y = Math.max(0, Math.min(height, p.pos.y));
    });

    state.time += dt;
  };

  // --- Render (Interpolation passed but not strictly used for simplicity in this style) ---
  const render = (alpha: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const { width, height, particles, hotspots } = state;

    // 1. Trails: Draw semi-transparent rectangle to fade previous frames
    // This creates the 'trail' effect without explicitly storing history
    ctx.fillStyle = 'rgba(5, 5, 12, 0.15)';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Hotspots (Subtle radial gradients)
    ctx.globalCompositeOperation = 'screen';
    hotspots.forEach(h => {
      const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, h.radius);
      grad.addColorStop(0, `hsla(${h.hue}, 80%, 50%, 0.15)`);
      grad.addColorStop(1, `hsla(${h.hue}, 80%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Draw Connections (Threads)
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;
    
    // Optimization: Only check a subset or accept O(N^2) for N=120 (14400 iter, fine for modern JS)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          const opacity = 1 - dist / CONNECTION_DIST;
          ctx.strokeStyle = `hsla(${(p1.hue + p2.hue) / 2}, 70%, 60%, ${opacity * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(p1.pos.x, p1.pos.y);
          ctx.lineTo(p2.pos.x, p2.pos.y);
          ctx.stroke();
        }
      }
    }

    // 4. Draw Particles
    ctx.globalCompositeOperation = 'source-over';
    particles.forEach(p => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsl(${p.hue}, 80%, 50%)`;
      ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
      
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.shadowBlur = 0; // Reset
  };

  // --- Loop Control ---
  const loop = (currentTime: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = currentTime;
    }

    const deltaTime = currentTime - previousTimeRef.current;
    previousTimeRef.current = currentTime;

    // Accumulator for fixed timestep
    accumulatorRef.current += deltaTime;

    // Safety: prevent spiral of death if tab was inactive
    if (accumulatorRef.current > 250) {
        accumulatorRef.current = 250;
    }

    while (accumulatorRef.current >= PHYSICS_DT) {
      update(PHYSICS_DT);
      accumulatorRef.current -= PHYSICS_DT;
    }

    // Render with alpha for interpolation (accumulator / PHYSICS_DT)
    // Though for this specific visual style, strict interpolation isn't critical
    render(accumulatorRef.current / PHYSICS_DT);

    requestRef.current = requestAnimationFrame(loop);
  };

  // --- Setup & Resize ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const { clientWidth, clientHeight } = canvasRef.current.parentElement;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        // Re-init logic on heavy resize or just update bounds?
        // Let's re-init to keep distribution clean for the demo
        initEngine(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    // Start Loop
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initEngine]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block touch-none"
    />
  );
};

export default CanvasLoop;
