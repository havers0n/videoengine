import React, { useEffect, useRef } from 'react';
import { SeededRNG } from '../utils/random';

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
  riskLevel: number; // 0.0 to 1.0
  pulsePhase: number;
}

interface ScanRing extends Point {
  currentRadius: number;
  maxRadius: number;
  spawnTime: number;
}

interface SimulationState {
  particles: Particle[];
  hotspots: Hotspot[];
  scanRings: ScanRing[];
  lastFrameTime: number;
  lastScanTime: number;
  rng: SeededRNG;
  width: number;
  height: number;
}

const ScannerCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable state stored in ref to avoid React renders during RAF
  const stateRef = useRef<SimulationState>({
    particles: [],
    hotspots: [],
    scanRings: [],
    lastFrameTime: 0,
    lastScanTime: 0,
    rng: new SeededRNG(1337), // Fixed seed for determinism
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: alpha false if we draw full background
    if (!ctx) return;

    // --- Initialization Logic ---
    const initSimulation = (w: number, h: number) => {
      const state = stateRef.current;
      state.width = w;
      state.height = h;
      
      // Reset RNG for deterministic restart on resize if desired, 
      // or keep current state to avoid jump. Let's keep stream continuous but bound check.
      // Re-seeding here would make resize predictable but jarring. We will just re-init bounds.
      
      // Initialize Hotspots (Risk Zones)
      // Use a temp RNG for placement to ensure placement logic is deterministic relative to 'now'
      // effectively, we just clear and rebuild for simplicity on resize
      state.rng = new SeededRNG(12345); 
      state.hotspots = [];
      const hotspotCount = 5;
      for (let i = 0; i < hotspotCount; i++) {
        state.hotspots.push({
          x: state.rng.range(w * 0.1, w * 0.9),
          y: state.rng.range(h * 0.1, h * 0.9),
          radius: state.rng.range(50, 150),
          riskLevel: state.rng.next(), // 0 to 1
          pulsePhase: state.rng.range(0, Math.PI * 2),
        });
      }

      // Initialize Particles
      state.particles = [];
      const particleCount = 80;
      for (let i = 0; i < particleCount; i++) {
        state.particles.push({
          id: i,
          x: state.rng.range(0, w),
          y: state.rng.range(0, h),
          vx: state.rng.range(-0.5, 0.5) * 60, // pixels per sec
          vy: state.rng.range(-0.5, 0.5) * 60,
        });
      }

      state.scanRings = [];
      state.lastFrameTime = performance.now();
      state.lastScanTime = performance.now();
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        initSimulation(width, height);
      }
    });

    resizeObserver.observe(container);

    // --- Animation Loop ---
    let animationFrameId: number;

    const render = (time: number) => {
      const state = stateRef.current;
      const dt = (time - state.lastFrameTime) / 1000; // Delta time in seconds
      state.lastFrameTime = time;

      // Cap dt to prevent huge jumps if tab was inactive
      const safeDt = Math.min(dt, 0.1);

      // 1. Trails Effect (Fade out previous frame)
      // We use a low opacity fillRect to create trails
      ctx.fillStyle = 'rgba(10, 10, 15, 0.2)'; // Dark blue-ish black
      ctx.fillRect(0, 0, state.width, state.height);

      // 2. Logic Updates
      
      // Update Particles
      state.particles.forEach(p => {
        p.x += p.vx * safeDt;
        p.y += p.vy * safeDt;

        // Bounce off walls
        if (p.x < 0 || p.x > state.width) p.vx *= -1;
        if (p.y < 0 || p.y > state.height) p.vy *= -1;

        // Keep bounds just in case
        p.x = Math.max(0, Math.min(p.x, state.width));
        p.y = Math.max(0, Math.min(p.y, state.height));
      });

      // Update Hotspots (Pulse)
      state.hotspots.forEach(h => {
        h.pulsePhase += safeDt * 2; // Speed of pulse
      });

      // Spawn Scan Ring periodically
      if (time - state.lastScanTime > 3000) {
        state.lastScanTime = time;
        // Randomly pick a hotspot to scan from, or center
        const source = state.hotspots.length > 0 
          ? state.hotspots[Math.floor(state.rng.next() * state.hotspots.length)]
          : { x: state.width/2, y: state.height/2 };
        
        state.scanRings.push({
          x: source.x,
          y: source.y,
          currentRadius: 0,
          maxRadius: Math.max(state.width, state.height) * 0.8,
          spawnTime: time,
        });
      }

      // Update Rings
      for (let i = state.scanRings.length - 1; i >= 0; i--) {
        const ring = state.scanRings[i];
        ring.currentRadius += 300 * safeDt; // Expansion speed
        if (ring.currentRadius > ring.maxRadius) {
          state.scanRings.splice(i, 1);
        }
      }

      // 3. Drawing

      // Draw Hotspots
      state.hotspots.forEach(h => {
        const pulse = (Math.sin(h.pulsePhase) + 1) / 2; // 0 to 1
        const radius = h.radius + pulse * 10;
        
        // Gradient for risk
        const gradient = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, radius);
        
        // Color based on risk level
        const r = Math.floor(255 * h.riskLevel);
        const g = Math.floor(100 * (1 - h.riskLevel));
        const colorBase = `rgba(${r}, ${g}, 50`;

        gradient.addColorStop(0, `${colorBase}, 0.4)`);
        gradient.addColorStop(0.6, `${colorBase}, 0.1)`);
        gradient.addColorStop(1, `${colorBase}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgb(${r}, ${g}, 50)`;
        ctx.fillStyle = `rgba(${r}, ${g}, 100, 0.8)`;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Threads (Hotspot -> Particle)
      ctx.lineWidth = 1;
      state.hotspots.forEach(h => {
        state.particles.forEach(p => {
          const dx = p.x - h.x;
          const dy = p.y - h.y;
          const distSq = dx*dx + dy*dy;
          const threshold = h.radius * 2.5; // Connect if relatively close
          
          if (distSq < threshold * threshold) {
            const dist = Math.sqrt(distSq);
            const alpha = 1 - (dist / threshold);
            
            // Color shift based on risk
            const r = Math.floor(255 * h.riskLevel);
            const g = 255;
            const b = 255;

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        });
      });

      // Draw Scan Rings
      ctx.lineWidth = 2;
      state.scanRings.forEach(ring => {
        const progress = ring.currentRadius / ring.maxRadius;
        const alpha = 1 - progress;
        
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      });

      // Draw Particles
      ctx.fillStyle = '#ffffff';
      state.particles.forEach(p => {
        // Simple dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // HUD Text (Drawn on canvas as per "No DOM overlay" for visuals)
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
      ctx.fillText(`ENTITIES: ${state.particles.length}`, 20, 30);
      ctx.fillText(`ZONES: ${state.hotspots.length}`, 20, 45);
      ctx.fillText(`SCAN: ${state.scanRings.length > 0 ? 'ACTIVE' : 'IDLE'}`, 20, 60);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default ScannerCanvas;