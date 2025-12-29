import React, { useRef, useEffect, useCallback } from 'react';
import { DeterministicRNG } from '../utils/rng';

// --- Configuration & Constants ---
const CYCLE_DURATION = 18000; // 18 seconds total cycle
const PARTICLE_COUNT = 180;
const CONNECTION_DISTANCE = 100;
const TRAIL_LENGTH = 12;
const MAX_SPEED = 6;
const FRICTION = 0.96;
const RNG_SEED = 1337;

// --- Types ---
interface Vector {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  history: Vector[];
  size: number;
  baseColor: string;
  hue: number;
  phaseOffset: number;
}

interface Hotspot {
  angle: number;
  radius: number;
  speed: number;
  strength: number;
  color: string;
}

enum Phase {
  ATTRACT = 'ATTRACT',
  REPULSE = 'REPULSE',
  TRANSITION = 'TRANSITION'
}

const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const phaseIndicatorRef = useRef<HTMLDivElement>(null);

  // Mutable State (No setState to avoid re-renders)
  const rng = useRef(new DeterministicRNG(RNG_SEED));
  const particles = useRef<Particle[]>([]);
  const hotspots = useRef<Hotspot[]>([]);
  
  // Initialize Simulation Data
  const initSimulation = useCallback((width: number, height: number) => {
    particles.current = [];
    hotspots.current = [];
    const r = rng.current;

    // Create Particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.current.push({
        x: r.range(0, width),
        y: r.range(0, height),
        vx: r.range(-1, 1),
        vy: r.range(-1, 1),
        history: [],
        size: r.range(1.5, 3.5),
        hue: r.range(180, 260), // Cyans and Blues
        baseColor: '', // Calculated in draw
        phaseOffset: r.range(0, Math.PI * 2)
      });
    }

    // Create Hotspots (Orbiting gravity wells)
    // 3 orbital hotspots
    for(let i=0; i<3; i++) {
        hotspots.current.push({
            angle: (Math.PI * 2 * i) / 3,
            radius: r.range(150, 300),
            speed: r.range(0.0005, 0.002) * (i % 2 === 0 ? 1 : -1),
            strength: r.range(0.3, 0.8),
            color: `hsla(${r.range(280, 320)}, 100%, 70%, 0.1)` // Magentas
        });
    }

  }, []);

  // Main Loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false }); // alpha: false for performance if we clear rect manually
    
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // --- 1. Timing & Phase Logic ---
    // Cycle: 0 -> 9s (Attract), 9s -> 18s (Repulse)
    const cycleTime = time % CYCLE_DURATION;
    const isAttractPhase = cycleTime < (CYCLE_DURATION / 2);
    const phaseProgress = (cycleTime % (CYCLE_DURATION / 2)) / (CYCLE_DURATION / 2);
    
    // Update UI text directly (Bypassing React render cycle)
    if (phaseIndicatorRef.current) {
        const phaseName = isAttractPhase ? "PHASE: SINGULARITY (ATTRACT)" : "PHASE: ENTROPY (REPULSE)";
        const color = isAttractPhase ? "text-cyan-400" : "text-rose-500";
        phaseIndicatorRef.current.innerHTML = `
          <span class="${color} font-bold text-lg">${phaseName}</span>
          <div class="w-full h-1 bg-gray-800 mt-1 rounded overflow-hidden">
            <div class="h-full ${isAttractPhase ? 'bg-cyan-500' : 'bg-rose-500'}" style="width: ${phaseProgress * 100}%"></div>
          </div>
          <span class="text-xs text-gray-500 font-mono mt-1 block">T: ${(cycleTime/1000).toFixed(2)}s / 18.00s</span>
        `;
    }

    // --- 2. Update Physics ---
    
    // Update Hotspots
    hotspots.current.forEach(h => {
        h.angle += h.speed * 16; // Approx delta for 60fps
    });

    particles.current.forEach((p, idx) => {
      // Calculate forces
      let fx = 0;
      let fy = 0;

      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const distSq = dx*dx + dy*dy;
      const dist = Math.sqrt(distSq);

      // Force 1: Core Attractor / Repulsor
      if (isAttractPhase) {
        // Attract to center. Stronger as phase progresses.
        const strength = 0.0005 * (1 + phaseProgress); 
        fx += dx * strength;
        fy += dy * strength;
        
        // Swirl effect
        fx += -dy * 0.001; 
        fy += dx * 0.001;

      } else {
        // Repulse from center. Explosive start, then tapering.
        // Use inverse square-ish logic but clamped to avoid infinity
        const repulseStrength = 0.5 * (1 - phaseProgress * 0.5); 
        const safeDist = Math.max(dist, 50);
        const force = (repulseStrength * 2000) / (safeDist); // Simplified radial push
        
        fx -= (dx / dist) * force;
        fy -= (dy / dist) * force;
      }

      // Force 2: Hotspots
      // Hotspots are always attractive but weak, creating "eddies" in the flow
      hotspots.current.forEach(h => {
          const hx = centerX + Math.cos(h.angle) * h.radius;
          const hy = centerY + Math.sin(h.angle) * h.radius;
          const hdx = hx - p.x;
          const hdy = hy - p.y;
          const hDist = Math.sqrt(hdx*hdx + hdy*hdy);
          
          if (hDist < 200) {
             const attraction = 0.002 * h.strength;
             fx += hdx * attraction;
             fy += hdy * attraction;
          }
      });

      // Noise / Jitter
      fx += (Math.sin(time * 0.005 + p.phaseOffset) * 0.02);
      fy += (Math.cos(time * 0.005 + p.phaseOffset) * 0.02);

      // Apply Physics
      p.vx += fx;
      p.vy += fy;
      p.vx *= FRICTION;
      p.vy *= FRICTION;

      // Speed Limit
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Bounds (Soft bounce/wrap)
      const margin = -50;
      if (p.x < margin) p.x = width - margin;
      if (p.x > width - margin) p.x = margin;
      if (p.y < margin) p.y = height - margin;
      if (p.y > height - margin) p.y = margin;

      // History for Trails
      p.history.push({x: p.x, y: p.y});
      if (p.history.length > TRAIL_LENGTH) {
        p.history.shift();
      }
    });

    // --- 3. Render ---
    
    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // Glow Effect
    ctx.globalCompositeOperation = 'screen';

    // Draw Hotspots (Faint Glows)
    hotspots.current.forEach(h => {
        const hx = centerX + Math.cos(h.angle) * h.radius;
        const hy = centerY + Math.sin(h.angle) * h.radius;
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 100);
        grad.addColorStop(0, h.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, 100, 0, Math.PI*2);
        ctx.fill();
    });

    // Draw Connections (Threads)
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.current.length; i++) {
        const p1 = particles.current[i];
        // Optimization: Only check a subset or neighbors? 
        // For <200 particles, nested loop is fine (approx 20k checks, manageable in <1ms on modern CPU)
        for (let j = i + 1; j < particles.current.length; j++) {
            const p2 = particles.current[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            // Cheap distance check (Manhattan first)
            if (Math.abs(dx) > CONNECTION_DISTANCE || Math.abs(dy) > CONNECTION_DISTANCE) continue;
            
            const distSq = dx*dx + dy*dy;
            if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
                const alpha = 1 - (Math.sqrt(distSq) / CONNECTION_DISTANCE);
                ctx.strokeStyle = isAttractPhase 
                    ? `rgba(0, 255, 255, ${alpha * 0.3})` 
                    : `rgba(255, 50, 100, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }

    // Draw Particles & Trails
    particles.current.forEach(p => {
        // Trails
        if (p.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let i=1; i<p.history.length; i++) {
                ctx.lineTo(p.history[i].x, p.history[i].y);
            }
            // Trail gradient
            const trailColor = isAttractPhase 
                ? `hsla(${p.hue}, 80%, 60%, 0.15)`
                : `hsla(${p.hue - 40}, 90%, 60%, 0.15)`; // Shift redder in repulse
            
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = p.size * 0.5;
            ctx.stroke();
        }

        // Core
        const mainColor = isAttractPhase 
             ? `hsla(${p.hue}, 100%, 70%, 1)`
             : `hsla(${p.hue - 50}, 100%, 60%, 1)`;

        ctx.fillStyle = mainColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = mainColor;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (isAttractPhase ? 1 : 1.5), 0, Math.PI*2);
        ctx.fill();
        
        // Reset shadow for next ops
        ctx.shadowBlur = 0;
    });

    ctx.globalCompositeOperation = 'source-over';

    requestRef.current = requestAnimationFrame(animate);
  }, [initSimulation]);

  // Initial Setup
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            // Handle DPR
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = width * dpr;
            canvasRef.current.height = height * dpr;
            canvasRef.current.style.width = `${width}px`;
            canvasRef.current.style.height = `${height}px`;
            
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
            
            // Re-init sim on resize to keep density consistent
            initSimulation(width, height);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    requestRef.current = requestAnimationFrame(animate);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(requestRef.current);
    };
  }, [animate, initSimulation]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* HUD Phase Indicator (Updated via ref manipulation for performance) */}
      <div 
        ref={phaseIndicatorRef} 
        className="absolute top-6 right-6 w-64 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded shadow-2xl pointer-events-none"
      >
        {/* Content injected by RAF loop */}
      </div>
    </div>
  );
};

export default SimulationCanvas;
