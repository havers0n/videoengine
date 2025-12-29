import React, { useRef, useEffect, useCallback } from 'react';
import { SeededRNG } from '../utils/rng';
import { EventType, GameEvent, Impulse, Thread, WorldState } from '../types';

interface NeonCanvasProps {
  seed: number;
}

// Configuration Constants
const MAX_THREADS = 400;
const TRAIL_LENGTH = 15;
const FRICTION_BASE = 0.96;
const IMPULSE_FORCE = 0.5;

const NeonCanvas: React.FC<NeonCanvasProps> = ({ seed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // High-performance mutable state refs (No React state in render loop)
  const rngRef = useRef<SeededRNG>(new SeededRNG(seed));
  const eventBusRef = useRef<GameEvent[]>([]);
  const stateRef = useRef<WorldState>({
    impulses: [],
    threads: [],
    lastTime: 0,
    width: 0,
    height: 0,
  });
  const reqIdRef = useRef<number>(0);

  // Initialize or Reset World
  const initWorld = useCallback((width: number, height: number) => {
    rngRef.current = new SeededRNG(seed);
    stateRef.current.impulses = [];
    stateRef.current.threads = [];
    stateRef.current.width = width;
    stateRef.current.height = height;
    stateRef.current.lastTime = performance.now();

    // Initial random impluses for visual start
    for (let i = 0; i < 3; i++) {
      eventBusRef.current.push({
        type: EventType.SPAWN_IMPULSE,
        timestamp: performance.now(),
        payload: {
          x: width * 0.2 + rngRef.current.range(0, width * 0.6),
          y: height * 0.2 + rngRef.current.range(0, height * 0.6),
          force: true
        }
      });
    }
  }, [seed]);

  // --- ENGINE LOGIC ---

  const spawnImpulse = (x: number, y: number) => {
    const rng = rngRef.current;
    const hue = rng.range(0, 360);
    
    const impulse: Impulse = {
      id: rng.next(), // Simple ID
      x,
      y,
      age: 0,
      maxAge: 2000, // ms
      radius: 0,
      strength: rng.range(0.8, 1.2),
      hue: hue
    };

    stateRef.current.impulses.push(impulse);

    // Spawn threads from impulse
    const threadCount = rng.rangeInt(20, 40);
    for (let i = 0; i < threadCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const speed = rng.range(2, 8);
      
      const thread: Thread = {
        id: rng.next(),
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        history: [],
        age: 0,
        maxAge: rng.range(1000, 3000),
        hue: hue + rng.range(-20, 20),
        friction: FRICTION_BASE + rng.range(-0.02, 0.02)
      };
      
      // Limit max threads for performance
      if (stateRef.current.threads.length < MAX_THREADS) {
        stateRef.current.threads.push(thread);
      } else {
        // Replace an old thread randomly to keep freshness
        const idx = rng.rangeInt(0, stateRef.current.threads.length);
        stateRef.current.threads[idx] = thread;
      }
    }
  };

  const update = (dt: number) => {
    const state = stateRef.current;
    const { width, height } = state;
    const rng = rngRef.current;

    // 1. Process Event Bus
    while (eventBusRef.current.length > 0) {
      const event = eventBusRef.current.shift();
      if (!event) continue;

      if (event.type === EventType.SPAWN_IMPULSE) {
        spawnImpulse(event.payload.x, event.payload.y);
      } else if (event.type === EventType.RESET) {
        initWorld(width, height);
      }
    }

    // 2. Update Impulses
    for (let i = state.impulses.length - 1; i >= 0; i--) {
      const impulse = state.impulses[i];
      impulse.age += dt;
      
      // Easing out expansion
      const progress = impulse.age / impulse.maxAge;
      impulse.radius += (1 - progress) * dt * 0.2;
      // Clamp radius to prevent negative values which cause canvas errors
      if (impulse.radius < 0) impulse.radius = 0;
      
      impulse.strength = 1 - progress;

      if (impulse.age >= impulse.maxAge) {
        state.impulses.splice(i, 1);
      }
    }

    // 3. Update Threads
    for (let i = state.threads.length - 1; i >= 0; i--) {
      const t = state.threads[i];
      t.age += dt;

      // Physics
      t.x += t.vx;
      t.y += t.vy;
      t.vx *= t.friction;
      t.vy *= t.friction;

      // Interaction with active impulses (Push/Pull)
      for (const impulse of state.impulses) {
        const dx = t.x - impulse.x;
        const dy = t.y - impulse.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        // Ring influence
        if (dist < impulse.radius + 50 && dist > impulse.radius - 20) {
           // Perturb threads near the shockwave ring
           const force = IMPULSE_FORCE * impulse.strength;
           const angle = Math.atan2(dy, dx);
           t.vx += Math.cos(angle) * force;
           t.vy += Math.sin(angle) * force;
           
           // Chance to renew life
           if (rng.chance(0.05)) {
             t.age *= 0.8;
           }
        }
      }

      // Bounds bounce
      if (t.x < 0 || t.x > width) t.vx *= -1;
      if (t.y < 0 || t.y > height) t.vy *= -1;

      // History for trails
      t.history.push({ x: t.x, y: t.y });
      if (t.history.length > TRAIL_LENGTH) {
        t.history.shift();
      }

      // Death
      if (t.age >= t.maxAge || (Math.abs(t.vx) < 0.1 && Math.abs(t.vy) < 0.1)) {
        state.threads.splice(i, 1);
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, dt: number) => {
    const state = stateRef.current;
    
    // Fade out trail effect (instead of clearRect)
    // Dark background but transparent to allow trails
    ctx.fillStyle = 'rgba(5, 5, 8, 0.2)'; 
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.globalCompositeOperation = 'lighter'; // Additive blending for neon look

    // Draw Impulses
    for (const impulse of state.impulses) {
      const alpha = impulse.strength;
      // Skip invalid or too small impulses to prevent gradient errors
      if (alpha <= 0.01 || impulse.radius < 0.1) continue;

      // Ensure non-negative radii for createRadialGradient
      const rOuter = Math.max(0.1, impulse.radius);
      const rInner = Math.max(0, rOuter * 0.8);

      const grad = ctx.createRadialGradient(
        impulse.x, impulse.y, rInner,
        impulse.x, impulse.y, rOuter
      );
      grad.addColorStop(0, `hsla(${impulse.hue}, 80%, 10%, 0)`);
      grad.addColorStop(0.5, `hsla(${impulse.hue}, 100%, 50%, ${alpha * 0.3})`);
      grad.addColorStop(1, `hsla(${impulse.hue}, 100%, 60%, 0)`);

      ctx.beginPath();
      ctx.arc(impulse.x, impulse.y, rOuter, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw Threads
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    for (const t of state.threads) {
      if (t.history.length < 2) continue;
      
      const life = 1 - (t.age / t.maxAge);
      const speed = Math.sqrt(t.vx*t.vx + t.vy*t.vy);
      
      ctx.beginPath();
      // Only draw the last segment for performance if many particles, 
      // but for trails we draw the path.
      // Optimization: Draw single path per thread
      const p0 = t.history[0];
      ctx.moveTo(p0.x, p0.y);
      for (let k = 1; k < t.history.length; k++) {
        ctx.lineTo(t.history[k].x, t.history[k].y);
      }
      
      // Color dynamics
      ctx.shadowBlur = 4;
      ctx.shadowColor = `hsla(${t.hue}, 80%, 50%, ${life})`;
      ctx.strokeStyle = `hsla(${t.hue}, 90%, 60%, ${life * 0.8})`;
      ctx.stroke();
      
      // Reset shadow for performance (shadows are expensive)
      ctx.shadowBlur = 0;
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  const loop = (timestamp: number) => {
    if (!stateRef.current.lastTime) stateRef.current.lastTime = timestamp;
    const dt = timestamp - stateRef.current.lastTime;
    
    // Cap dt to prevent spiral of death on lag
    const safeDt = Math.min(dt, 64); 

    update(safeDt);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
      if (ctx) {
        draw(ctx, safeDt);
      }
    }

    stateRef.current.lastTime = timestamp;
    reqIdRef.current = requestAnimationFrame(loop);
  };

  // --- HANDLERS ---

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    eventBusRef.current.push({
      type: EventType.SPAWN_IMPULSE,
      timestamp: performance.now(),
      payload: { x, y }
    });
  };

  const handleResize = useCallback(() => {
    if (canvasRef.current && canvasRef.current.parentElement) {
      const { clientWidth, clientHeight } = canvasRef.current.parentElement;
      canvasRef.current.width = clientWidth;
      canvasRef.current.height = clientHeight;
      stateRef.current.width = clientWidth;
      stateRef.current.height = clientHeight;
      // Re-init world on massive resize or just let it adjust? 
      // Let's just update bounds, but maybe clear if size changes drastically
    }
  }, []);

  // --- EFFECTS ---

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Seed init
    initWorld(stateRef.current.width, stateRef.current.height);

    // Start Loop
    reqIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqIdRef.current);
    };
  }, [handleResize, initWorld]); // Dependencies allow re-init on seed change

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="w-full h-full touch-none cursor-crosshair block"
      style={{ background: '#050508' }}
    />
  );
};

export default NeonCanvas;