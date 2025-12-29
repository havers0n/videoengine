import React, { useEffect, useRef, useCallback } from 'react';
import { SeededRNG } from '../utils/rng';
import { EventBus } from '../utils/eventBus';
import { SimulationEvent, EventType, Particle, Trail, Hotspot, Vector2 } from '../types';

const INITIAL_SEED = 12345;
const COLOR_PALETTE = ['#00f0ff', '#ff003c', '#fcee0a', '#7dff00'];

export const CanvasStage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Mutable state stored in ref to avoid React re-renders during animation loop
  const stateRef = useRef({
    rng: new SeededRNG(INITIAL_SEED),
    bus: new EventBus(),
    particles: [] as Particle[],
    trails: [] as Trail[],
    hotspots: [] as Hotspot[],
    lastTime: 0,
    width: 0,
    height: 0,
    autoPulseTimer: 0,
    mouseX: 0,
    mouseY: 0,
  });

  // --- Physics & Logic (Deterministic) ---

  const spawnImpulse = (pos: Vector2, intensity: number, rng: SeededRNG) => {
    const count = Math.floor(10 * intensity);
    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const speed = rng.range(2, 8) * intensity;
      
      const p: Particle = {
        id: rng.next(),
        pos: { ...pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        acc: { x: 0, y: 0 },
        life: 1.0,
        maxLife: rng.range(0.8, 1.5),
        color: COLOR_PALETTE[Math.floor(rng.next() * COLOR_PALETTE.length)],
        size: rng.range(1, 3),
        type: rng.chance(0.2) ? 'core' : 'spark',
      };
      stateRef.current.particles.push(p);
    }

    // Create a hotspot at impact
    stateRef.current.hotspots.push({
      pos: { ...pos },
      radius: 5 * intensity,
      intensity: 1.0,
      color: COLOR_PALETTE[Math.floor(rng.next() * COLOR_PALETTE.length)],
      decay: 0.02,
    });
  };

  const update = (dt: number) => {
    const state = stateRef.current;
    const { bus, rng, particles, trails, hotspots, width, height } = state;

    // 1. Process Events
    const events = bus.consume();
    events.forEach(event => {
      if (event.type === EventType.IMPULSE || event.type === EventType.PULSE) {
        spawnImpulse(event.position, event.intensity, rng);
      } else if (event.type === EventType.RESET) {
        state.particles = [];
        state.trails = [];
        state.hotspots = [];
        state.rng = new SeededRNG(INITIAL_SEED); // Reset RNG for deterministic replay
      }
    });

    // 2. Auto Pulse (Every ~2 seconds)
    state.autoPulseTimer += dt;
    if (state.autoPulseTimer > 2000) {
        state.autoPulseTimer = 0;
        const x = rng.range(width * 0.2, width * 0.8);
        const y = rng.range(height * 0.2, height * 0.8);
        bus.push({
            type: EventType.PULSE,
            position: { x, y },
            intensity: 1.5,
            timestamp: performance.now()
        });
    }

    // 3. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      
      // Physics
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.vel.x *= 0.96; // Friction
      p.vel.y *= 0.96;
      
      // Gravity / Flow
      p.vel.y += 0.05;

      // Bounce
      if (p.pos.x < 0 || p.pos.x > width) p.vel.x *= -0.8;
      if (p.pos.y < 0 || p.pos.y > height) p.vel.y *= -0.8;

      p.life -= 0.01;

      // Trail Generation logic
      if (p.type === 'core' && rng.chance(0.3)) {
        trails.push({
            points: [{...p.pos}, { x: p.pos.x - p.vel.x * 2, y: p.pos.y - p.vel.y * 2}],
            color: p.color,
            width: p.size,
            life: 1.0
        });
      }

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 4. Update Trails
    for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.life -= 0.03;
        if (t.life <= 0) trails.splice(i, 1);
    }

    // 5. Update Hotspots
    for (let i = hotspots.length - 1; i >= 0; i--) {
        const h = hotspots[i];
        h.intensity -= h.decay;
        h.radius += 0.5;
        if (h.intensity <= 0) hotspots.splice(i, 1);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { particles, trails, hotspots, width, height } = stateRef.current;

    // Clear with trail effect
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(5, 5, 8, 0.2)'; // Dark Fade
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'screen'; // Additive blending for neon look

    // Draw Hotspots (Glow)
    hotspots.forEach(h => {
        const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, h.radius);
        grad.addColorStop(0, `${h.color}${Math.floor(h.intensity * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Trails
    trails.forEach(t => {
        ctx.beginPath();
        ctx.moveTo(t.points[0].x, t.points[0].y);
        ctx.lineTo(t.points[1].x, t.points[1].y);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = t.width * t.life;
        ctx.globalAlpha = t.life;
        ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        
        // Shadow blur for glow on particles
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
    });
  };

  const loop = (time: number) => {
    const state = stateRef.current;
    if (!state.lastTime) state.lastTime = time;
    const dt = time - state.lastTime;
    
    // Cap dt to prevent huge jumps if tab is inactive
    const safeDt = Math.min(dt, 50);

    update(safeDt);
    
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
    }

    state.lastTime = time;
    requestRef.current = requestAnimationFrame(loop);
  };

  // --- Handlers ---

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
      // Add event to bus without state update
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Throttle mouse events to bus slightly
      if (Math.random() > 0.8) {
          stateRef.current.bus.push({
              type: EventType.IMPULSE,
              position: { x, y },
              intensity: 0.5,
              timestamp: performance.now()
          });
      }
      stateRef.current.mouseX = x;
      stateRef.current.mouseY = y;
  }, []);

  const handleClick = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    stateRef.current.bus.push({
        type: EventType.IMPULSE,
        position: { x, y },
        intensity: 2.0, // Stronger impulse on click
        timestamp: performance.now()
    });
  }, []);

  const handleResize = useCallback(() => {
      if (canvasRef.current) {
          const { innerWidth, innerHeight } = window;
          canvasRef.current.width = innerWidth;
          canvasRef.current.height = innerHeight;
          stateRef.current.width = innerWidth;
          stateRef.current.height = innerHeight;
      }
  }, []);

  // --- Effect: Mount ---

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleResize]); // Empty dependency ensures runs once

  return (
    <div className="relative w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        className="block touch-none cursor-crosshair"
      />
      <div className="absolute top-4 left-4 pointer-events-none select-none text-white/50 text-xs font-mono">
        <p>NEON FLUX 18s // DETERMINISTIC ENGINE</p>
        <p>RNG SEED: {INITIAL_SEED}</p>
        <p>INTERACT: MOVE / CLICK</p>
      </div>
    </div>
  );
};
