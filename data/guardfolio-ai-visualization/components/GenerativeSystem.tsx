import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Particle, SystemState, CYCLE_DURATION } from '../types';

// --- Utilities ---
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const easeInOutSine = (x: number): number => -(Math.cos(Math.PI * x) - 1) / 2;

// --- Constants ---
const PARTICLE_COUNT = 300;
const CONNECTION_DISTANCE = 100;

export const GenerativeSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  
  // Simulation State
  const particles = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);
  
  // UI State (Text)
  const [displayText, setDisplayText] = useState<string>("");
  const [textOpacity, setTextOpacity] = useState<number>(0);

  // Initialize Particles
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();

    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      newParticles.push({
        id: i,
        pos: { x: Math.random() * width, y: Math.random() * height },
        vel: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 },
        acc: { x: 0, y: 0 },
        radius: Math.random() * 2 + 1,
        baseColor: `hsla(210, 80%, 70%, 1)`, // Base blue-ish
        life: Math.random(),
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * Math.min(width, height) * 0.4
      });
    }
    particles.current = newParticles;
  }, []);

  // Main Animation Loop
  useEffect(() => {
    const animate = (time: number) => {
      if (!canvasRef.current || !containerRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      
      // Handle resize
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Calculate Cycle Progress (0 - 18s)
      const cycleTime = time % CYCLE_DURATION;
      const t = cycleTime / CYCLE_DURATION; // 0.0 to 1.0

      // Determine System Parameters based on Phase
      let state: SystemState;
      
      // PHASE 1: STABILITY (0 - 6s) -> t: 0.0 - 0.33
      if (t < 0.33) {
        const localT = t / 0.33;
        const easedT = easeInOutSine(localT);
        state = {
            energy: lerp(0.2, 0.3, easedT),
            noise: lerp(0.05, 0.1, easedT),
            structure: lerp(0.8, 0.7, easedT),
            tension: lerp(0.0, 0.2, easedT),
            focusX: 0,
            focusY: 0,
            phase: 'stability'
        };
        if (localT > 0.1 && localT < 0.8) {
             setDisplayText("Everything seems stable.");
             setTextOpacity(Math.min((localT - 0.1) * 4, 1, (0.8 - localT) * 4));
        } else if (localT > 0.8) {
             setTextOpacity(0);
        }
      } 
      // PHASE 2: RISK EMERGENCE (6 - 12s) -> t: 0.33 - 0.66
      else if (t < 0.66) {
        const localT = (t - 0.33) / 0.33;
        const easedT = easeInOutSine(localT);
        state = {
            energy: lerp(0.3, 0.8, easedT),
            noise: lerp(0.1, 0.9, easedT), // High noise
            structure: lerp(0.7, 0.2, easedT), // Structure breaking
            tension: lerp(0.2, 1.0, easedT),
            focusX: Math.sin(time * 0.002) * 0.5, // Wandering focus
            focusY: Math.cos(time * 0.003) * 0.3,
            phase: 'risk'
        };
        if (localT > 0.1 && localT < 0.8) {
            setDisplayText("Hidden structure emerges.");
            setTextOpacity(Math.min((localT - 0.1) * 4, 1, (0.8 - localT) * 4));
       } else if (localT > 0.8) {
            setTextOpacity(0);
       }
      } 
      // PHASE 3: INSIGHT & CONTROL (12 - 18s) -> t: 0.66 - 1.0
      else {
        const localT = (t - 0.66) / 0.34; // Remaining time
        const easedT = easeInOutSine(localT);
        state = {
            energy: lerp(0.8, 0.4, easedT), // Settling down
            noise: lerp(0.9, 0.1, easedT), // Noise resolving
            structure: lerp(0.2, 0.95, easedT), // Structure returning stronger
            tension: lerp(1.0, 0.0, easedT),
            focusX: lerp(Math.sin(time * 0.002) * 0.5, 0, easedT), // Recentering
            focusY: lerp(Math.cos(time * 0.003) * 0.3, 0, easedT),
            phase: 'control'
        };
        if (localT > 0.1 && localT < 0.9) {
            setDisplayText("Guardfolio AI");
            setTextOpacity(Math.min((localT - 0.1) * 4, 1, (0.9 - localT) * 4));
       } else if (localT > 0.9) {
            setTextOpacity(0);
       }
      }

      // --- RENDER ---

      // Clear with trail effect
      ctx.fillStyle = 'rgba(5, 5, 10, 0.2)'; // Low opacity for trails
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2 + state.focusX * (width * 0.3);
      const centerY = height / 2 + state.focusY * (height * 0.3);

      // Particle Physics
      particles.current.forEach(p => {
        // 1. Structure Force: Pull towards orbital rings or grid
        if (state.structure > 0.5) {
            const targetX = width/2 + Math.cos(p.angle) * p.distance;
            const targetY = height/2 + Math.sin(p.angle) * p.distance;
            const dx = targetX - p.pos.x;
            const dy = targetY - p.pos.y;
            p.acc.x += dx * 0.001 * state.structure;
            p.acc.y += dy * 0.001 * state.structure;
        }

        // 2. Noise/Chaos Force
        if (state.noise > 0) {
            const angle = (p.id * 0.1) + time * 0.001;
            p.acc.x += Math.cos(angle * 3.4) * state.noise * 0.5;
            p.acc.y += Math.sin(angle * 2.1) * state.noise * 0.5;
        }

        // 3. Hotspot/Tension (Attractor/Repulsor)
        if (state.tension > 0) {
            const dx = centerX - p.pos.x;
            const dy = centerY - p.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // In Risk phase, the center is volatile (pulls then pushes)
            const forceDir = state.phase === 'risk' && Math.sin(time * 0.005) > 0 ? -1 : 1;
            
            if (dist > 10) {
                const force = (1000 / (dist * dist + 100)) * state.tension * forceDir;
                p.acc.x += dx * force;
                p.acc.y += dy * force;
            }
        }

        // 4. Update Velocity & Position
        p.vel.x += p.acc.x;
        p.vel.y += p.acc.y;
        
        // Dampening (Friction) - lower damping in high energy states
        const friction = 0.94 + (state.energy * 0.02);
        p.vel.x *= friction;
        p.vel.y *= friction;

        // Speed Limit
        const speed = Math.sqrt(p.vel.x*p.vel.x + p.vel.y*p.vel.y);
        const maxSpeed = 2 + state.energy * 4;
        if (speed > maxSpeed) {
            p.vel.x = (p.vel.x / speed) * maxSpeed;
            p.vel.y = (p.vel.y / speed) * maxSpeed;
        }

        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;

        // Reset Acc
        p.acc.x = 0;
        p.acc.y = 0;

        // Boundaries (Soft wrap)
        if (p.pos.x < 0) p.pos.x = width;
        if (p.pos.x > width) p.pos.x = 0;
        if (p.pos.y < 0) p.pos.y = height;
        if (p.pos.y > height) p.pos.y = 0;

        // Update Orbital Angle for next frame structure target
        p.angle += 0.002 * (1 + state.energy);
      });

      // Draw Connections (Correlation Threads)
      // Only draw connections if structure is decent or during specific risk moments
      if (state.structure > 0.3 || state.phase === 'risk') {
          ctx.beginPath();
          ctx.strokeStyle = state.phase === 'risk' 
            ? `rgba(255, 50, 80, ${state.tension * 0.15})` // Reddish in risk
            : `rgba(100, 200, 255, ${state.structure * 0.1})`; // Blueish in stability
            
          for (let i = 0; i < particles.current.length; i+=2) { // Skip some for perf
              const p1 = particles.current[i];
              // Connect to neighbors
              for (let j = i + 1; j < particles.current.length; j+=4) { // Heuristic neighbor check
                   const p2 = particles.current[j];
                   const dx = p1.pos.x - p2.pos.x;
                   const dy = p1.pos.y - p2.pos.y;
                   const distSq = dx*dx + dy*dy;
                   
                   if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
                       ctx.moveTo(p1.pos.x, p1.pos.y);
                       ctx.lineTo(p2.pos.x, p2.pos.y);
                   }
              }
          }
          ctx.stroke();
      }

      // Draw Particles
      particles.current.forEach(p => {
        ctx.beginPath();
        const screenX = p.pos.x;
        const screenY = p.pos.y;
        
        // Color Modulation based on Phase
        let hue = 210; // Default Blue
        let sat = 80;
        let light = 70;
        let alpha = 0.8;

        if (state.phase === 'risk') {
            // Shift towards purple/pink/red based on speed/tension
            const speed = Math.sqrt(p.vel.x**2 + p.vel.y**2);
            hue = lerp(210, 340, Math.min(speed / 4, 1)); // Blue -> Red
            sat = 90;
            light = 60;
        } else if (state.phase === 'control') {
            // Shift towards Cyan/White
            hue = 180;
            sat = 100;
            light = lerp(70, 95, state.structure); // Brighter
        }

        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
        
        // Size modulation
        const radius = state.phase === 'risk' ? p.radius * (1 + Math.random()*0.5) : p.radius;
        
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect for Control phase
        if (state.phase === 'control' && Math.random() > 0.9) {
             ctx.shadowBlur = 10;
             ctx.shadowColor = `hsla(${hue}, ${sat}%, ${light}%, 0.5)`;
             ctx.fill();
             ctx.shadowBlur = 0;
        }
      });

      // Draw Hotspot Hint (Risk Phase Only)
      if (state.phase === 'risk') {
          const riskRadius = 100 + Math.sin(time * 0.01) * 20;
          const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, riskRadius);
          grad.addColorStop(0, 'rgba(255, 50, 80, 0.0)');
          grad.addColorStop(0.5, `rgba(255, 50, 80, ${0.1 * state.tension})`);
          grad.addColorStop(1, 'rgba(255, 50, 80, 0)');
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, riskRadius, 0, Math.PI*2);
          ctx.fill();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Semantic Overlay */}
      <div 
        className="absolute bottom-12 left-12 pointer-events-none transition-opacity duration-1000 ease-in-out"
        style={{ opacity: textOpacity }}
      >
        <h2 className="text-white text-lg font-light tracking-[0.2em] uppercase opacity-80 border-l-2 border-cyan-500 pl-4">
            {displayText}
        </h2>
        <div className="mt-2 flex space-x-1 pl-4">
             {/* Abstract signal indicators */}
             <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
             <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-75"></div>
             <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>

      {/* Subtle vignettes */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#050505_120%)]"></div>
    </div>
  );
};