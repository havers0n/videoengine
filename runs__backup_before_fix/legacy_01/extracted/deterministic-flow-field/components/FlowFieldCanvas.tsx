import React, { useRef, useEffect, useMemo } from 'react';
import { SeededRNG } from '../utils/rng';
import { initParticles, initHotspots, calculateGrid, updateParticle } from '../utils/field';
import { SEED, DURATION_MS, FADE_ALPHA, GLOW_BLUR, GLOW_COLOR } from '../constants';
import { Particle, Hotspot, GridCell } from '../types';

const FlowFieldCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Runtime State (Refs)
  const particlesRef = useRef<Particle[]>([]);
  const hotspotsRef = useRef<Hotspot[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  // Dimensions ref to handle resize logic inside RAF without state
  const sizeRef = useRef({ w: 0, h: 0 });

  // Initialize deterministic RNG once
  const rng = useMemo(() => new SeededRNG(SEED), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    // Initial Resize
    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        sizeRef.current = { w: canvas.width, h: canvas.height };
        
        // Re-init particles on resize to fit screen, seeded RNG ensures consistent chaos
        // Resetting RNG state here would be ideal for strict consistency across resizes, 
        // but keeping flow continuous is visually better.
        if (particlesRef.current.length === 0) {
          particlesRef.current = initParticles(rng, canvas.width, canvas.height);
          hotspotsRef.current = initHotspots(rng, canvas.width, canvas.height);
        } else {
             // If resizing, just re-distribute out of bounds particles
             particlesRef.current.forEach(p => {
                 if (p.pos.x > canvas.width) p.pos.x = canvas.width - 1;
                 if (p.pos.y > canvas.height) p.pos.y = canvas.height - 1;
             });
             // Re-calc hotspots positions relative to new size
             hotspotsRef.current = initHotspots(rng, canvas.width, canvas.height);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start Timer
    startTimeRef.current = performance.now();

    const render = (time: number) => {
      // Time Loop Logic
      const elapsed = time - startTimeRef.current;
      const t = (elapsed % DURATION_MS) / DURATION_MS; // 0.0 to 1.0

      const width = sizeRef.current.w;
      const height = sizeRef.current.h;

      // 1. Fade effect (Trails)
      // We draw a semi-transparent rectangle over the previous frame
      ctx.fillStyle = `rgba(0, 0, 0, ${FADE_ALPHA})`;
      ctx.fillRect(0, 0, width, height);

      // 2. Calculate Flow Field Grid
      // In a very high perf scenario we might optimize this, but for 48x27 grid it's fast.
      const grid: GridCell[][] = calculateGrid(width, height, t, hotspotsRef.current);

      // 3. Update and Draw Particles
      // Set common styles
      ctx.lineCap = 'round';
      ctx.shadowBlur = GLOW_BLUR;
      ctx.shadowColor = GLOW_COLOR;

      particlesRef.current.forEach(p => {
        updateParticle(p, grid, width, height);

        // Draw Streamline Segment
        ctx.beginPath();
        ctx.moveTo(p.prevPos.x, p.prevPos.y);
        ctx.lineTo(p.pos.x, p.pos.y);
        
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.stroke();
      });

      // Optional: Visualize Hotspots (Subtle debug view)
      /*
      hotspotsRef.current.forEach(h => {
         ctx.beginPath();
         ctx.arc(h.pos.x, h.pos.y, 5, 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
         ctx.fill();
      });
      */

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [rng]);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full touch-none"
    />
  );
};

export default FlowFieldCanvas;