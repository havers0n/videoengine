import React, { useRef, useEffect, useCallback } from 'react';
import { SeededRNG } from '../utils/rng';

interface Point {
  x: number;
  y: number;
}

interface Particle extends Point {
  vx: number;
  vy: number;
  id: number;
}

interface Hotspot extends Point {
  radius: number;
  intensity: number;
  pulseOffset: number;
}

interface SimulationState {
  particles: Particle[];
  hotspots: Hotspot[];
  scanRadius: number;
  scanActive: boolean;
  lastTime: number;
  frameCount: number;
  fps: number;
  width: number;
  height: number;
}

const SEED = 12345;
const PARTICLE_COUNT = 150;
const HOTSPOT_COUNT = 4;
const SCAN_SPEED = 300; // pixels per second
const TRAIL_ALPHA = 0.2; // Lower = longer trails
const CONNECTION_DISTANCE = 150;

export const ScannerSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable state reference to avoid React re-renders during animation loop
  const stateRef = useRef<SimulationState>({
    particles: [],
    hotspots: [],
    scanRadius: 0,
    scanActive: true,
    lastTime: 0,
    frameCount: 0,
    fps: 0,
    width: 0,
    height: 0,
  });

  // RNG instance
  const rngRef = useRef<SeededRNG>(new SeededRNG(SEED));

  const initSimulation = useCallback((width: number, height: number) => {
    const rng = rngRef.current;
    const state = stateRef.current;
    
    state.width = width;
    state.height = height;
    state.scanRadius = 0;
    state.particles = [];
    state.hotspots = [];

    // Initialize Hotspots
    for (let i = 0; i < HOTSPOT_COUNT; i++) {
      state.hotspots.push({
        x: rng.range(width * 0.1, width * 0.9),
        y: rng.range(height * 0.1, height * 0.9),
        radius: rng.range(80, 150),
        intensity: rng.range(0.5, 1.0),
        pulseOffset: rng.next() * Math.PI * 2,
      });
    }

    // Initialize Particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      state.particles.push({
        x: rng.range(0, width),
        y: rng.range(0, height),
        vx: rng.range(-30, 30),
        vy: rng.range(-30, 30),
        id: i,
      });
    }

    state.lastTime = performance.now();
  }, []);

  const draw = (ctx: CanvasRenderingContext2D, time: number) => {
    const state = stateRef.current;
    const { width, height, particles, hotspots, scanRadius } = state;

    // 1. Trails Effect (Clear with opacity)
    ctx.fillStyle = `rgba(5, 5, 8, ${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Hotspots
    hotspots.forEach((spot) => {
      const pulse = Math.sin(time * 0.002 + spot.pulseOffset);
      const radius = spot.radius + pulse * 10;
      
      const gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, radius);
      gradient.addColorStop(0, `rgba(255, 60, 60, ${0.4 * spot.intensity})`);
      gradient.addColorStop(0.4, `rgba(200, 40, 40, ${0.1 * spot.intensity})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(spot.x, spot.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 100, 100, ${0.6 + pulse * 0.2})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'red';
      ctx.arc(spot.x, spot.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset
    });

    // 3. Draw Scan Ring
    if (state.scanActive) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, scanRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'cyan';
      ctx.stroke();

      // Scan fill (faint)
      const scanGradient = ctx.createRadialGradient(width / 2, height / 2, scanRadius - 50, width / 2, height / 2, scanRadius);
      scanGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
      scanGradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
      ctx.fillStyle = scanGradient;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. Update & Draw Particles + Threads
    ctx.fillStyle = '#ffffff';
    
    particles.forEach((p) => {
      // Draw particle
      const distToCenter = Math.hypot(p.x - width / 2, p.y - height / 2);
      const inScan = Math.abs(distToCenter - scanRadius) < 40;
      const isScanned = distToCenter < scanRadius;

      // Highlight if near scan ring
      if (inScan) {
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'cyan';
      } else {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, inScan ? 2 : 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Threads to hotspots
      hotspots.forEach((h) => {
        const dx = p.x - h.x;
        const dy = p.y - h.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Logic: Draw line if close AND (either inside active scan area OR very close to hotspot)
        if (dist < CONNECTION_DISTANCE) {
          const proximity = 1 - dist / CONNECTION_DISTANCE;
          let alpha = proximity * 0.3;
          
          // Boost visibility if scanned
          if (isScanned) alpha += 0.2;
          // Boost visibility if scan ring is passing exactly over it
          if (inScan) alpha = 0.8;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(h.x, h.y);
          ctx.strokeStyle = `rgba(255, ${255 * (1-proximity)}, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    // 5. HUD / Text Overlay (No DOM)
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${state.fps.toFixed(1)}`, 20, 30);
    ctx.fillText(`ENTITIES: ${PARTICLE_COUNT}`, 20, 50);
    ctx.fillText(`TIME: ${(time / 1000).toFixed(2)}s`, 20, 70);
    
    if (state.scanActive) {
        const pct = Math.min(100, (scanRadius / (Math.max(width, height) * 0.8)) * 100);
        ctx.fillText(`SCAN: ${pct.toFixed(0)}%`, 20, 90);
    }
  };

  const update = (time: number) => {
    const state = stateRef.current;
    const dt = (time - state.lastTime) / 1000;
    state.lastTime = time;

    // Update FPS
    state.frameCount++;
    if (state.frameCount % 20 === 0) {
        state.fps = 1 / dt;
    }

    // Update particles
    state.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Bounce
      if (p.x < 0 || p.x > state.width) p.vx *= -1;
      if (p.y < 0 || p.y > state.height) p.vy *= -1;
    });

    // Update Scanner
    if (state.scanActive) {
      state.scanRadius += SCAN_SPEED * dt;
      const maxRadius = Math.max(state.width, state.height) * 0.8; // Reset before corners
      if (state.scanRadius > maxRadius) {
        state.scanRadius = 0; // Loop
      }
    }
  };

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize
    if (!ctx) return;

    update(time);
    draw(ctx, time);

    requestAnimationFrame(loop);
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        initSimulation(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    const rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [initSimulation, loop]);

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block"
      />
    </div>
  );
};