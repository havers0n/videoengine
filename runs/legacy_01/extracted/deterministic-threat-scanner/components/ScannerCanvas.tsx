import React, { useRef, useEffect } from 'react';
import { SeededRNG } from '../utils/rng';
import { Particle, Hotspot, SimulationState, Vector2 } from '../types';

const INITIAL_SEED = 12345;
const PARTICLE_COUNT = 150;
const HOTSPOT_COUNT = 5;
const MAX_CONNECTION_DIST = 120;
const SCAN_SPEED = 150; // Pixels per second

const ScannerCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  
  // Mutable state reference to avoid React re-renders during animation loop
  const stateRef = useRef<SimulationState>({
    particles: [],
    hotspots: [],
    scanRadius: 0,
    scanActive: true,
    scanSpeed: SCAN_SPEED,
    lastFrameTime: 0,
    dimensions: { width: 0, height: 0 }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
    if (!ctx) return;

    // --- Initialization Logic ---
    const initSimulation = (width: number, height: number) => {
      const rng = new SeededRNG(INITIAL_SEED);
      const state = stateRef.current;
      
      state.dimensions = { width, height };
      state.lastFrameTime = performance.now();
      state.scanRadius = 0;

      // Initialize Hotspots
      state.hotspots = Array.from({ length: HOTSPOT_COUNT }).map((_, i) => ({
        id: i,
        pos: {
          x: rng.range(width * 0.1, width * 0.9),
          y: rng.range(height * 0.1, height * 0.9),
        },
        radius: rng.range(40, 80),
        riskLevel: rng.next(), // 0 to 1
        pulsePhase: rng.range(0, Math.PI * 2),
      }));

      // Initialize Particles
      state.particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        id: i,
        pos: {
          x: rng.range(0, width),
          y: rng.range(0, height),
        },
        vel: {
          x: rng.range(-20, 20), // Pixels per second
          y: rng.range(-20, 20),
        },
        active: true,
      }));
    };

    // --- Resize Handler ---
    const handleResize = () => {
      if (canvas) {
        // Use devicePixelRatio for sharp rendering on high DPI screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale context
        ctx.scale(dpr, dpr);
        
        // Logical dimensions for state
        initSimulation(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    // --- Animation Loop ---
    const loop = (timestamp: number) => {
      const state = stateRef.current;
      const dt = (timestamp - state.lastFrameTime) / 1000; // Delta time in seconds
      state.lastFrameTime = timestamp;

      const { width, height } = state.dimensions;

      // 1. Clear with trails effect (draw semi-transparent black rectangle)
      ctx.fillStyle = 'rgba(10, 10, 15, 0.2)'; // Dark blue-black trace
      ctx.fillRect(0, 0, width, height);

      // 2. Update Physics
      
      // Update Particles
      state.particles.forEach(p => {
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;

        // Bounce off walls
        if (p.pos.x < 0 || p.pos.x > width) p.vel.x *= -1;
        if (p.pos.y < 0 || p.pos.y > height) p.vel.y *= -1;
      });

      // Update Hotspots (Pulse)
      state.hotspots.forEach(h => {
        h.pulsePhase += dt * 2;
      });

      // Update Scan Ring
      if (state.scanActive) {
        state.scanRadius += state.scanSpeed * dt;
        const maxRadius = Math.max(width, height) * 1.2;
        if (state.scanRadius > maxRadius) {
          state.scanRadius = 0; // Reset loop
        }
      }

      // 3. Draw Scene

      // Helper: Distance squared
      const distSq = (v1: Vector2, v2: Vector2) => 
        (v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2;

      // Draw Threads (Hotspot -> Particle)
      ctx.lineWidth = 1;
      state.hotspots.forEach(h => {
        state.particles.forEach(p => {
          const d2 = distSq(h.pos, p.pos);
          const threshold2 = MAX_CONNECTION_DIST * MAX_CONNECTION_DIST;
          
          if (d2 < threshold2) {
            const dist = Math.sqrt(d2);
            const alpha = 1 - (dist / MAX_CONNECTION_DIST);
            
            // Risk determines color: Green (low) -> Red (high)
            const r = Math.floor(255 * h.riskLevel);
            const g = Math.floor(255 * (1 - h.riskLevel));
            
            ctx.strokeStyle = `rgba(${r}, ${g}, 100, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(h.pos.x, h.pos.y);
            ctx.lineTo(p.pos.x, p.pos.y);
            ctx.stroke();
          }
        });
      });

      // Draw Particles
      state.particles.forEach(p => {
        // Simple glow effect
        const isActiveInScan = Math.abs(
          Math.sqrt(distSq(p.pos, {x: width/2, y: height/2})) - state.scanRadius
        ) < 50;

        ctx.fillStyle = isActiveInScan ? '#ffffff' : '#4ade80'; // White if scanned, Green otherwise
        ctx.shadowBlur = isActiveInScan ? 10 : 0;
        ctx.shadowColor = '#ffffff';
        
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, isActiveInScan ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // Draw Hotspots
      state.hotspots.forEach(h => {
        const pulse = Math.sin(h.pulsePhase) * 5;
        const radius = h.radius + pulse;

        // Gradient for risk
        const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, radius);
        // Low risk: Cyan/Blue, High risk: Red/Orange
        if (h.riskLevel > 0.6) {
            grad.addColorStop(0, `rgba(255, 50, 50, 0.4)`);
            grad.addColorStop(1, `rgba(255, 0, 0, 0)`);
        } else {
            grad.addColorStop(0, `rgba(50, 255, 255, 0.2)`);
            grad.addColorStop(1, `rgba(0, 255, 255, 0)`);
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = h.riskLevel > 0.6 ? '#f87171' : '#22d3ee';
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Scan Ring
      if (state.scanActive) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        ctx.beginPath();
        ctx.arc(0, 0, state.scanRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 128, 0.5)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ff80';
        ctx.stroke();

        // Inner fading fill for the ring
        ctx.beginPath();
        ctx.arc(0, 0, state.scanRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 128, 0.05)';
        ctx.fill();

        ctx.restore();
      }

      // Draw Text (No DOM Overlay)
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`SYSTEM_TIME: ${timestamp.toFixed(1)}ms`, 20, 30);
      ctx.fillText(`ENTITIES: ${state.particles.length}`, 20, 50);
      ctx.fillText(`HOTSPOTS: ${state.hotspots.length}`, 20, 70);
      
      const riskAvg = (state.hotspots.reduce((acc, h) => acc + h.riskLevel, 0) / state.hotspots.length * 100).toFixed(1);
      
      ctx.fillStyle = parseFloat(riskAvg) > 50 ? '#ef4444' : '#22d3ee';
      ctx.fillText(`THREAT_LEVEL: ${riskAvg}%`, 20, 90);

      // Decorative corners
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      const cornerSize = 40;
      // Top-Left
      ctx.beginPath(); ctx.moveTo(10, cornerSize); ctx.lineTo(10, 10); ctx.lineTo(cornerSize, 10); ctx.stroke();
      // Top-Right
      ctx.beginPath(); ctx.moveTo(width - 10, cornerSize); ctx.lineTo(width - 10, 10); ctx.lineTo(width - cornerSize, 10); ctx.stroke();
      // Bottom-Left
      ctx.beginPath(); ctx.moveTo(10, height - cornerSize); ctx.lineTo(10, height - 10); ctx.lineTo(cornerSize, height - 10); ctx.stroke();
      // Bottom-Right
      ctx.beginPath(); ctx.moveTo(width - 10, height - cornerSize); ctx.lineTo(width - 10, height - 10); ctx.lineTo(width - cornerSize, height - 10); ctx.stroke();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
        {/* Canvas fills the screen. No DOM text overlay allowed as per requirements. */}
        <canvas 
          ref={canvasRef} 
          className="block w-full h-full"
        />
    </div>
  );
};

export default ScannerCanvas;