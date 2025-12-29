import React, { useRef, useEffect } from 'react';
import { CONFIG, DURATION, FIXED_DT } from '../constants';
import { initSimulation, updateSimulation } from '../src/engine/simulation';
import { SimulationState } from '../src/engine/types';
import { distSq, hexToRgb } from '../src/engine/math';

const CanvasEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef<number>(0);

  // Parse colors once
  const calmPrimary = CONFIG.COLORS.CALM_PRIMARY; // Green
  const calmSecondary = CONFIG.COLORS.CALM_SECONDARY; // Cyan
  const hotPrimary = CONFIG.COLORS.HOT_PRIMARY; // Red
  const hotSecondary = CONFIG.COLORS.HOT_SECONDARY; // Orange

  const draw = (ctx: CanvasRenderingContext2D, state: SimulationState) => {
    const { width, height } = ctx.canvas;
    
    // 1. Clear & Background
    // Create a deep radial gradient background
    const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
    bgGradient.addColorStop(0, CONFIG.COLORS.BG_TOP);
    bgGradient.addColorStop(1, CONFIG.COLORS.BG_BOTTOM);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const tSec = state.time / 1000;
    const isPhase2 = tSec >= 6 && tSec < 12;
    const isPhase3 = tSec >= 12;

    // 2. Draw Connections (Threads)
    // Optimization: This is O(N^2) but acceptable for N=350 on standard resolution.
    // We only draw lines if distance is short.
    ctx.lineWidth = 0.5;
    
    // Group logic to minimize state changes
    ctx.globalCompositeOperation = 'screen';
    
    for (let i = 0; i < state.particles.length; i++) {
      const p1 = state.particles[i];
      // Skip some checks for performance
      for (let j = i + 1; j < state.particles.length; j++) {
        const p2 = state.particles[j];
        
        // Quick AABB check before distSq
        if (Math.abs(p1.x - p2.x) > CONFIG.CONNECTION_DIST || Math.abs(p1.y - p2.y) > CONFIG.CONNECTION_DIST) continue;

        const d2 = distSq(p1.x, p1.y, p2.x, p2.y);
        
        if (d2 < CONFIG.CONNECTION_DIST_SQ) {
          const alpha = 1 - Math.sqrt(d2) / CONFIG.CONNECTION_DIST;
          
          if (alpha > 0.1) {
            // Interpolate color based on heat of both particles
            const avgHeat = (p1.heat + p2.heat) / 2;
            
            // Color blending logic
            let r, g, b;
            if (avgHeat > 0.1) {
               // Mix Green/Cyan -> Red/Orange
               r = calmSecondary[0] * (1 - avgHeat) + hotPrimary[0] * avgHeat;
               g = calmSecondary[1] * (1 - avgHeat) + hotPrimary[1] * avgHeat;
               b = calmSecondary[2] * (1 - avgHeat) + hotPrimary[2] * avgHeat;
            } else {
               r = calmPrimary[0];
               g = calmPrimary[1];
               b = calmPrimary[2];
            }

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }

    // 3. Draw Particles & Trails
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

    state.particles.forEach(p => {
      // Color based on heat
      let r, g, b;
      if (p.heat > 0.05) {
        r = calmSecondary[0] * (1 - p.heat) + hotSecondary[0] * p.heat;
        g = calmSecondary[1] * (1 - p.heat) + hotSecondary[1] * p.heat;
        b = calmSecondary[2] * (1 - p.heat) + hotSecondary[2] * p.heat;
      } else {
        r = calmSecondary[0];
        g = calmSecondary[1];
        b = calmSecondary[2];
      }
      
      const colorBase = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;

      // Draw Trail
      if (p.history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = colorBase;
        for (let k = 0; k < p.history.length - 1; k++) {
          const pos = p.history[k];
          const nextPos = p.history[k+1];
          // Alpha fade along trail
          const trailAlpha = ((p.history.length - k) / p.history.length) * 0.3;
          ctx.globalAlpha = trailAlpha;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(nextPos.x, nextPos.y);
          ctx.stroke();
        }
      }

      // Draw Head
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = colorBase;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isPhase3 ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw Hotspots (Debug Visual / Glow)
    if (isPhase2 || (isPhase3 && state.time < 15000)) {
      state.hotspots.forEach(h => {
        if (!h.active) return;
        
        // Subtle red wash around scan nodes
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
        grad.addColorStop(0, `rgba(${hotPrimary[0]}, ${hotPrimary[1]}, ${hotPrimary[2]}, 0.1)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  };

  const loop = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }

    const deltaTime = (time - previousTimeRef.current) / 1000;
    previousTimeRef.current = time;

    // Accumulator logic for strict fixed timestep
    accumulatorRef.current += deltaTime;
    // Clamp accumulator to prevent spiral of death on lag spikes
    if (accumulatorRef.current > 0.25) accumulatorRef.current = 0.25;

    // Safety init
    if (!stateRef.current && canvasRef.current) {
      stateRef.current = initSimulation(canvasRef.current.width, canvasRef.current.height);
    }

    if (stateRef.current && canvasRef.current) {
      // Loop physics steps
      while (accumulatorRef.current >= FIXED_DT) {
        updateSimulation(stateRef.current, FIXED_DT, canvasRef.current.width, canvasRef.current.height);
        accumulatorRef.current -= FIXED_DT;
      }

      // Check for reset/loop or just freeze at end
      if (stateRef.current.time > DURATION) {
        // Reset for infinite loop demo, or just stop? 
        // Request implies "18 seconds scene". Let's loop it for replayability.
        stateRef.current = initSimulation(canvasRef.current.width, canvasRef.current.height);
      }

      // Render
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        draw(ctx, stateRef.current);
      }
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    // Canvas sizing
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        // Re-init simulation on resize to keep clusters on screen
        stateRef.current = initSimulation(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Minimal Overlay */}
      <div className="absolute top-6 left-6 font-mono text-xs text-white/50 tracking-widest pointer-events-none select-none">
        <div>DETERMINISTIC CLUSTER LATTICE</div>
        <div>T_MAX: 18.00s | DT: 16.6ms | SEED: {CONFIG.PARTICLE_COUNT}X</div>
      </div>
      
      {/* Optional Phase Indicator (Pure CSS/HTML, no React State to avoid re-renders) */}
      <div className="absolute bottom-6 right-6 font-mono text-xs text-white/30 text-right pointer-events-none">
         STATUS: RUNNING<br/>
         RENDER: CANVAS 2D
      </div>
    </div>
  );
};

export default CanvasEngine;