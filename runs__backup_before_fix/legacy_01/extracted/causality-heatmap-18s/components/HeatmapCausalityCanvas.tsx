import React, { useEffect, useRef } from 'react';
import {
  LOOP_DURATION_MS,
  GRID_COLS,
  GRID_ROWS,
  PARTICLE_COUNT,
  SEED,
  COLORS,
  TRAIL_LENGTH,
  THREAD_DISTANCE_SQ,
  HEAT_THRESHOLD_FOR_LINK,
} from '../constants';
import { Particle, GridCell, PulseEvent, Hotspot } from '../types';
import { DeterministicRNG } from '../utils/rng';
import { lerp, clamp, distSq, rgbToRgbaString, mapRange } from '../utils/math';

const HeatmapCausalityCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a ref to hold mutable simulation state to avoid React re-renders during RAF
  const stateRef = useRef<{
    particles: Particle[];
    grid: Float32Array; // 1D array representing 2D grid
    pulses: PulseEvent[];
    hotspots: Hotspot[];
    rng: DeterministicRNG;
    width: number;
    height: number;
    cellWidth: number;
    cellHeight: number;
  }>({
    particles: [],
    grid: new Float32Array(GRID_COLS * GRID_ROWS),
    pulses: [],
    hotspots: [],
    rng: new DeterministicRNG(SEED),
    width: 0,
    height: 0,
    cellWidth: 0,
    cellHeight: 0,
  });

  // Initialization Logic
  const initSimulation = (width: number, height: number) => {
    const rng = new DeterministicRNG(SEED);
    const state = stateRef.current;
    
    state.width = width;
    state.height = height;
    state.cellWidth = width / GRID_COLS;
    state.cellHeight = height / GRID_ROWS;
    state.rng = rng;

    // 1. Initialize Particles
    state.particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      id: i,
      pos: { x: rng.range(0, width), y: rng.range(0, height) },
      vel: { x: rng.range(-0.5, 0.5), y: rng.range(-0.5, 0.5) },
      history: [],
      activation: 0,
    }));

    // 2. Initialize Grid (Zeroed out initially)
    state.grid.fill(0);

    // 3. Define Pulses (Events) - Deterministic
    state.pulses = [
      { id: 1, startTime: 0.1, duration: 0.15, centerX: 10, centerY: 10, intensity: 0.8 },
      { id: 2, startTime: 0.3, duration: 0.2, centerX: 45, centerY: 25, intensity: 0.9 },
      { id: 3, startTime: 0.5, duration: 0.1, centerX: 32, centerY: 18, intensity: 1.0 }, // Middle burst
      { id: 4, startTime: 0.7, duration: 0.2, centerX: 15, centerY: 30, intensity: 0.7 },
      { id: 5, startTime: 0.85, duration: 0.1, centerX: 55, centerY: 5, intensity: 0.6 },
    ];

    // 4. Define Hotspots (Static Risk Areas)
    state.hotspots = [
      { x: GRID_COLS * 0.2, y: GRID_ROWS * 0.3, radius: 8, baseIntensity: 0.4, pulseSpeed: 2 },
      { x: GRID_COLS * 0.8, y: GRID_ROWS * 0.7, radius: 10, baseIntensity: 0.5, pulseSpeed: 3 },
      { x: GRID_COLS * 0.5, y: GRID_ROWS * 0.5, radius: 6, baseIntensity: 0.3, pulseSpeed: 1.5 },
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas bg
    if (!ctx) return;

    // Handle Resize
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvas.width = clientWidth;
        canvas.height = clientHeight;
        initSimulation(clientWidth, clientHeight);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    
    const loop = () => {
      const now = performance.now();
      const loopTime = now % LOOP_DURATION_MS;
      const t = loopTime / LOOP_DURATION_MS; // Normalized time 0..1

      update(t);
      draw(ctx, t);

      animationFrameId = requestAnimationFrame(loop);
    };

    // --- Update Logic ---
    const update = (t: number) => {
      const state = stateRef.current;
      const { grid, particles, pulses, hotspots, cellWidth, cellHeight, width, height, rng } = state;

      // 1. Grid Dynamics (Diffusion & Decay)
      for (let i = 0; i < grid.length; i++) {
        grid[i] *= 0.94; // Decay
      }

      // 2. Apply Hotspots (Steady heat sources with slight breathing)
      hotspots.forEach(hs => {
        const breathing = Math.sin(t * Math.PI * 2 * hs.pulseSpeed) * 0.1 + 1.0;
        const radiusSq = (hs.radius * breathing) ** 2;
        
        // Optimization: Only iterate bounding box around hotspot
        const minX = Math.max(0, Math.floor(hs.x - hs.radius * 1.5));
        const maxX = Math.min(GRID_COLS - 1, Math.ceil(hs.x + hs.radius * 1.5));
        const minY = Math.max(0, Math.floor(hs.y - hs.radius * 1.5));
        const maxY = Math.min(GRID_ROWS - 1, Math.ceil(hs.y + hs.radius * 1.5));

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dSq = (x - hs.x) ** 2 + (y - hs.y) ** 2;
            if (dSq < radiusSq) {
              const falloff = 1 - dSq / radiusSq;
              const idx = y * GRID_COLS + x;
              grid[idx] = Math.max(grid[idx], hs.baseIntensity * falloff);
            }
          }
        }
      });

      // 3. Apply Pulses (Events)
      pulses.forEach(p => {
        // Check if pulse is active based on loop time 't'
        // Allow wrap-around logic if needed, but simple window check is mostly fine for 0..1
        if (t >= p.startTime && t <= p.startTime + p.duration) {
          const pulseProgress = (t - p.startTime) / p.duration; // 0..1
          // Expand radius over time
          const currentRadius = lerp(0, 15, Math.sin(pulseProgress * Math.PI)); 
          const currentIntensity = p.intensity * (1 - pulseProgress); // Fade out

          const radiusSq = currentRadius * currentRadius;
          const minX = Math.max(0, Math.floor(p.centerX - currentRadius));
          const maxX = Math.min(GRID_COLS - 1, Math.ceil(p.centerX + currentRadius));
          const minY = Math.max(0, Math.floor(p.centerY - currentRadius));
          const maxY = Math.min(GRID_ROWS - 1, Math.ceil(p.centerY + currentRadius));

          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const dSq = (x - p.centerX) ** 2 + (y - p.centerY) ** 2;
              if (dSq < radiusSq) {
                const idx = y * GRID_COLS + x;
                grid[idx] += currentIntensity * 0.1 * (1 - dSq / radiusSq); // Additive heat
              }
            }
          }
        }
      });

      // 4. Update Particles
      particles.forEach(p => {
        // Determine grid cell index
        const gx = Math.floor(p.pos.x / cellWidth);
        const gy = Math.floor(p.pos.y / cellHeight);
        const safeGx = clamp(gx, 0, GRID_COLS - 1);
        const safeGy = clamp(gy, 0, GRID_ROWS - 1);
        const idx = safeGy * GRID_COLS + safeGx;
        
        const localHeat = grid[idx];
        p.activation = lerp(p.activation, localHeat, 0.1);

        // Movement: Random walk + slight flow away from intense heat (pressure)
        // or attraction to heat? Let's do excitement (velocity increase) in heat.
        
        const speedMult = 1 + localHeat * 2;
        
        // Jitter / Brownian motion
        // Use RNG, but since we are in update, we just use the seeded one sequentially. 
        // It stays deterministic as long as the call order is the same.
        const angle = rng.range(0, Math.PI * 2);
        
        p.vel.x += Math.cos(angle) * 0.05 * speedMult;
        p.vel.y += Math.sin(angle) * 0.05 * speedMult;

        // Damping
        p.vel.x *= 0.96;
        p.vel.y *= 0.96;

        // Apply velocity
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;

        // Bounds wrap
        if (p.pos.x < 0) p.pos.x = width;
        if (p.pos.x > width) p.pos.x = 0;
        if (p.pos.y < 0) p.pos.y = height;
        if (p.pos.y > height) p.pos.y = 0;

        // Update History (Trails)
        p.history.push({ x: p.pos.x, y: p.pos.y });
        if (p.history.length > TRAIL_LENGTH) {
          p.history.shift();
        }
      });
    };

    // --- Draw Logic ---
    const draw = (ctx: CanvasRenderingContext2D, t: number) => {
      const state = stateRef.current;
      const { width, height, grid, particles, cellWidth, cellHeight } = state;

      // Clear
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Heatmap (Grid)
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const val = grid[y * GRID_COLS + x];
          if (val > 0.05) {
            const displayVal = clamp(val, 0, 1);
            // Interpolate color from Low to High
            const r = lerp(COLORS.heatLow[0], COLORS.heatHigh[0], displayVal);
            const g = lerp(COLORS.heatLow[1], COLORS.heatHigh[1], displayVal);
            const b = lerp(COLORS.heatLow[2], COLORS.heatHigh[2], displayVal);
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${displayVal * 0.8})`;
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1); // +1 to fix gaps
          }
        }
      }

      // 2. Draw Connections (Threads)
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = 'screen'; // Make connections glow
      
      // Optimization: Spatial partitioning is better, but N=150 is small enough for O(N^2) ~22k ops
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (p1.activation < 0.1) continue; // Skip cold particles

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (p2.activation < 0.1) continue;

          // Wrap-around distance check is complex, doing simple Euclidean here
          const d2 = distSq(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
          
          if (d2 < THREAD_DISTANCE_SQ) {
            // Check if both are in "high risk" zones or just correlated by proximity
            // Strength of line depends on shared heat
            const combinedHeat = (p1.activation + p2.activation) / 2;
            if (combinedHeat > HEAT_THRESHOLD_FOR_LINK) {
              const alpha = mapRange(d2, 0, THREAD_DISTANCE_SQ, 1, 0) * combinedHeat;
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.pos.x, p1.pos.y);
              ctx.lineTo(p2.pos.x, p2.pos.y);
              ctx.stroke();
            }
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // 3. Draw Particles & Trails
      particles.forEach(p => {
        // Trails
        if (p.history.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = p.activation > 0.5 ? COLORS.particleHot : COLORS.particle;
            // Lower opacity for trail tail
            for (let i = 0; i < p.history.length - 1; i++) {
                const pt1 = p.history[i];
                const pt2 = p.history[i+1];
                const alpha = i / p.history.length;
                ctx.globalAlpha = alpha * 0.5;
                ctx.lineWidth = 1 + alpha;
                ctx.beginPath();
                ctx.moveTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        }

        // Particle Head
        const radius = 2 + p.activation * 3;
        ctx.fillStyle = p.activation > 0.6 ? COLORS.particleHot : COLORS.particle;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow if hot
        if (p.activation > 0.7) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.particleHot;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
      });

      // 4. Overlay Info
      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.fillText(`T: ${t.toFixed(3)} | Agents: ${particles.length}`, 10, 20);
      
      // Draw Timeline Bar
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(0, height - 4, width, 4);
      ctx.fillStyle = COLORS.particleHot;
      ctx.fillRect(0, height - 4, width * t, 4);
      
      // Draw Pulse markers on timeline
      state.pulses.forEach(p => {
          ctx.fillStyle = COLORS.pulse;
          ctx.fillRect(width * p.startTime, height - 8, width * p.duration, 4);
      });
    };

    // Start loop
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-900 overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
      />
      <div className="absolute top-4 right-4 pointer-events-none text-right">
        <h1 className="text-white font-bold text-xl tracking-widest opacity-80 uppercase">Causality Heatmap</h1>
        <div className="flex flex-col items-end gap-1 mt-2 text-xs text-slate-400 font-mono">
           <div className="flex items-center gap-2">
             <span>RNG SEED: {SEED}</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-rose-500 rounded-full inline-block"></span>
             <span>High Risk</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-sky-400 rounded-full inline-block"></span>
             <span>Agents</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCausalityCanvas;