import React, { useEffect, useRef } from 'react';
import { DeterministicRNG } from '../utils/rng';
import { 
  LOOP_DURATION_MS, 
  PARTICLE_COUNT, 
  COLORS, 
  FONT_FAMILY, 
  TRAIL_LENGTH, 
  CONNECTION_DISTANCE, 
  SEED 
} from '../constants';
import { Particle, SimulationState, Phase } from '../types';

const HudEngineCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use a ref to hold mutable runtime state to avoid React renders during the loop
  const stateRef = useRef<SimulationState>({
    particles: [],
    width: 0,
    height: 0,
    phase: Phase.CALM,
  });

  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent background
    if (!ctx) return;

    // --- Initialization ---
    const initParticles = (width: number, height: number) => {
      const rng = new DeterministicRNG(SEED);
      const particles: Particle[] = [];
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = rng.range(0, width);
        const y = rng.range(0, height);
        particles.push({
          x,
          y,
          vx: rng.range(-0.5, 0.5),
          vy: rng.range(-0.5, 0.5),
          baseX: x,
          baseY: y,
          size: rng.range(1, 2.5),
          phaseOffset: rng.next() * Math.PI * 2,
          id: i,
          history: []
        });
      }
      return particles;
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        stateRef.current.width = canvas.width;
        stateRef.current.height = canvas.height;
        // Re-init particles on drastic resize to fit screen, 
        // or just keep them (we'll re-init for simplicity to ensure seeded consistency relative to screen size if needed, 
        // but here we just map existing ones to boundaries if we wanted, but let's just re-init for this demo).
        stateRef.current.particles = initParticles(canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    // --- Math Helpers ---
    const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    // --- Render Loop ---
    const animate = (timestamp: number) => {
      const { width, height, particles } = stateRef.current;
      
      // Calculate Cycle Time
      // t goes from 0.0 to 1.0 over 18 seconds
      const t = (timestamp % LOOP_DURATION_MS) / LOOP_DURATION_MS;

      // --- 1. Determine Phase & Global Dynamics ---
      let phase: Phase = Phase.CALM;
      let chaosLevel = 0; // 0 to 1
      let speedMultiplier = 1;
      let globalColor = COLORS.primary;

      // Phase Logic
      // 0.0 - 0.35: Calm
      // 0.35 - 0.65: Anomaly (Peak at 0.5)
      // 0.65 - 1.0: Resolution/Cooldown
      
      if (t < 0.35) {
        phase = Phase.CALM;
        chaosLevel = t / 0.35 * 0.2; // slight buildup
        speedMultiplier = 1;
        globalColor = COLORS.primary;
      } else if (t < 0.70) {
        phase = Phase.ANOMALY;
        // Bell curve-ish for anomaly intensity
        const localT = (t - 0.35) / 0.35; 
        chaosLevel = Math.sin(localT * Math.PI); // 0 -> 1 -> 0
        speedMultiplier = 1 + (chaosLevel * 4); // Speed up significantly
        // Interpolate color from Cyan to Red based on chaos
        globalColor = chaosLevel > 0.5 ? COLORS.danger : COLORS.warning;
      } else {
        phase = Phase.RESOLUTION;
        const localT = (t - 0.70) / 0.30;
        chaosLevel = (1 - localT) * 0.1; // Fading out
        speedMultiplier = 1 - (localT * 0.5); // Slow down
        globalColor = COLORS.success;
      }
      
      stateRef.current.phase = phase;

      // --- 2. Update Physics ---
      
      // Define Hotspots (attractors/repulsors)
      // Hotspots move based on t
      const spotA = { 
        x: width * 0.25 + Math.cos(t * Math.PI * 4) * 100, 
        y: height * 0.5 + Math.sin(t * Math.PI * 2) * 50 
      };
      const spotB = { 
        x: width * 0.75 + Math.sin(t * Math.PI * 4) * 100, 
        y: height * 0.5 + Math.cos(t * Math.PI * 2) * 50 
      };

      particles.forEach(p => {
        // Basic Velocity with noise
        let vx = p.vx * speedMultiplier;
        let vy = p.vy * speedMultiplier;

        // Phase Behaviors
        if (phase === Phase.CALM) {
            // Gentle drift, flow field approx
            const angle = (p.x * 0.002) + (p.y * 0.002) + t * 2;
            vx += Math.cos(angle) * 0.2;
            vy += Math.sin(angle) * 0.2;
        } else if (phase === Phase.ANOMALY) {
            // Chaotic attraction to hotspots
            const dAx = spotA.x - p.x;
            const dAy = spotA.y - p.y;
            const distA = Math.sqrt(dAx*dAx + dAy*dAy);
            
            const dBx = spotB.x - p.x;
            const dBy = spotB.y - p.y;
            const distB = Math.sqrt(dBx*dBx + dBy*dBy);

            // Strong pull if chaos is high
            const pullStrength = 0.005 * chaosLevel;
            
            if (p.id % 2 === 0) {
                vx += dAx * pullStrength;
                vy += dAy * pullStrength;
            } else {
                vx += dBx * pullStrength;
                vy += dBy * pullStrength;
            }

            // Jitter
            vx += (Math.sin(p.id + t * 50) * chaosLevel * 2);
            vy += (Math.cos(p.id + t * 50) * chaosLevel * 2);

        } else if (phase === Phase.RESOLUTION) {
            // Return to origin logic or circular formation
            const dx = (width / 2) - p.x;
            const dy = (height / 2) - p.y;
            vx += dx * 0.001;
            vy += dy * 0.001;
        }

        p.x += vx;
        p.y += vy;

        // Bounds check (wrap around)
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Update History (Trails)
        p.history.unshift({ x: p.x, y: p.y });
        if (p.history.length > TRAIL_LENGTH) {
          p.history.pop();
        }
      });


      // --- 3. Draw Frame ---
      
      // Clear with slight fade for trails effect (optional, but we use explicit trails)
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, width, height);

      // Draw Grid (Subtle)
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gridSize = 100;
      // Moving grid effect
      const offsetX = (t * 200) % gridSize;
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Hotspots (Visual representation)
      const drawHotspot = (x: number, y: number, color: string, intensity: number) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 100 * intensity);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(x, y, 100 * intensity, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      };

      if (phase === Phase.ANOMALY) {
          drawHotspot(spotA.x, spotA.y, COLORS.danger, chaosLevel);
          drawHotspot(spotB.x, spotB.y, COLORS.danger, chaosLevel);
      } else if (phase === Phase.RESOLUTION) {
          drawHotspot(width/2, height/2, COLORS.success, 0.5);
      }

      // Draw Particles & Connections
      ctx.lineWidth = 1;
      
      // Batch drawing for performance
      // Draw Connections first
      ctx.beginPath();
      ctx.strokeStyle = globalColor;
      
      // Optimization: Only check connections for a subset or neighbors
      // For N=180, N^2 is small enough for modern JS (32k checks), but let's optimize slightly by checking distance
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        // Draw Trail
        if (p1.history.length > 1) {
             // Draw individual trail
             const trailPath = new Path2D();
             trailPath.moveTo(p1.history[0].x, p1.history[0].y);
             for(let h=1; h<p1.history.length; h++) {
                 trailPath.lineTo(p1.history[h].x, p1.history[h].y);
             }
             ctx.save();
             ctx.globalAlpha = 0.3;
             ctx.strokeStyle = globalColor;
             ctx.stroke(trailPath);
             ctx.restore();
        }

        // Connections (Threads)
        // Only connect to nearby neighbors to form a plexus
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx*dx + dy*dy;
            
            // Interaction distance squared (100^2 = 10000)
            const threshold = phase === Phase.ANOMALY ? 150*150 : 100*100;
            
            if (distSq < threshold) {
                const alpha = 1 - (Math.sqrt(distSq) / Math.sqrt(threshold));
                ctx.save();
                ctx.globalAlpha = alpha * 0.5; // fainter lines
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            }
        }
      }

      // Draw Particle Heads
      particles.forEach(p => {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow effect
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = globalColor;
          ctx.fill();
          ctx.restore();
      });


      // --- 4. Draw HUD (Overlay) ---
      renderHud(ctx, width, height, t, chaosLevel, phase);

      requestRef.current = requestAnimationFrame(animate);
    };

    // --- HUD Logic ---
    const renderHud = (
      ctx: CanvasRenderingContext2D, 
      w: number, 
      h: number, 
      t: number, 
      chaos: number,
      phase: Phase
    ) => {
        const pad = 40;
        const fontSize = 14;
        const lineHeight = 24;
        const startX = pad;
        const startY = h - pad - (5 * lineHeight);

        ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Deterministic Value Generation
        // Use Sin/Cos to create "fake" data that correlates with t
        
        // 1. Risk Score (0 - 100)
        // Calm: 10-30, Anomaly: 80-99, Res: 40-10
        let risk = 0;
        if (phase === Phase.CALM) risk = 20 + Math.sin(t * 20) * 10;
        else if (phase === Phase.ANOMALY) risk = 85 + Math.cos(t * 50) * 14;
        else risk = 30 + Math.sin(t * 10) * 20 * (1-t); // Decays
        risk = clamp(risk, 0, 100);

        // 2. Hidden Exposure (Million $)
        const exposure = 4.2 + (chaos * 8.5) + Math.cos(t * 100) * 0.5;

        // 3. Correlation Spike (0.00 - 1.00)
        const correlation = 0.15 + (chaos * 0.8) + (Math.sin(t * 200) * 0.05);

        // 4. Liquidity Stress (Index)
        const stress = 1000 - (risk * 8) + Math.random() * 0; // No random, strictly functional

        // Color logic for HUD
        const getHudColor = (val: number, threshold: number) => {
            return val > threshold ? COLORS.danger : COLORS.primary;
        };

        // Helper to draw line
        const drawLine = (label: string, value: string, color: string, index: number) => {
            const y = startY + (index * lineHeight);
            
            // Label
            ctx.fillStyle = COLORS.text;
            ctx.globalAlpha = 0.7;
            ctx.fillText(label, startX, y);

            // Value
            const labelWidth = ctx.measureText(label).width;
            ctx.fillStyle = color;
            ctx.globalAlpha = 1.0;
            // Add a blinking cursor effect deterministically
            const cursor = Math.floor(t * 100) % 2 === 0 ? '_' : ' ';
            ctx.fillText(`${value} ${cursor}`, startX + labelWidth + 10, y);
        };

        drawLine("RISK SCORE", risk.toFixed(2), getHudColor(risk, 70), 0);
        drawLine("HIDDEN EXPOSURE", `$${exposure.toFixed(2)}M`, getHudColor(exposure, 8), 1);
        drawLine("CORRELATION SPIKE", correlation.toFixed(4), getHudColor(correlation, 0.7), 2);
        drawLine("LIQUIDITY STRESS", Math.floor(stress).toString(), stress < 500 ? COLORS.danger : COLORS.success, 3);
        
        // STATUS line
        let statusText = "SYSTEM_NORMAL";
        let statusColor = COLORS.success;
        
        if (phase === Phase.ANOMALY) {
            statusText = "INTRUSION_DETECTED";
            statusColor = COLORS.danger;
            // Glitch effect on text position for anomaly
            if (Math.sin(t * 500) > 0.8) {
                ctx.save();
                ctx.translate(Math.random() * 2 -1, Math.random() * 2 - 1); // Tiny micro shake OK in draw if needed, but per prompt avoiding math.random in logic. 
                // Let's use deterministic shake
                ctx.translate(Math.sin(t*900)*2, Math.cos(t*900)*2);
            }
        } else if (phase === Phase.RESOLUTION) {
            statusText = "MITIGATING...";
            statusColor = COLORS.warning;
        }

        drawLine("STATUS", `[ ${statusText} ]`, statusColor, 4);
        ctx.restore(); // Restore if we did glitch transform

        // Draw Progress Bar at bottom
        const progressW = w - (pad * 2);
        const progressH = 4;
        const progressY = h - pad + 10;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(pad, progressY, progressW, progressH);
        
        ctx.fillStyle = COLORS.primary;
        if (phase === Phase.ANOMALY) ctx.fillStyle = COLORS.danger;
        if (phase === Phase.RESOLUTION) ctx.fillStyle = COLORS.success;
        
        ctx.fillRect(pad, progressY, progressW * t, progressH);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full"
    />
  );
};

export default HudEngineCanvas;