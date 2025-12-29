import React, { useEffect, useRef, useState } from 'react';
import { lerp, clamp, smoothStep, getFibonacciSpherePoint, lerpColor, colorToString, RGB } from '../utils/math';

interface Particle {
  id: number;
  // Current Position
  x: number;
  y: number;
  z: number;
  // Velocity
  vx: number;
  vy: number;
  vz: number;
  // Original/Drift Phase Properties
  driftOffsetX: number;
  driftOffsetY: number;
  driftSpeed: number;
  phaseOffset: number;
  // Target Structure Position (Lattice)
  targetX: number;
  targetY: number;
  targetZ: number;
}

const TOTAL_DURATION = 18000; // 18s in ms
const PARTICLE_COUNT = 140;

// Color Palette
const COLOR_NEUTRAL: RGB = { r: 100, g: 100, b: 120 }; // Faint grey/blue
const COLOR_DANGER: RGB = { r: 255, g: 70, b: 20 };   // Hot orange/red
const COLOR_STABLE: RGB = { r: 0, g: 255, b: 240 };   // Cyan

const GravitationalSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Text state managed outside canvas for DOM overlay
  const [textState, setTextState] = useState<{ text: string; opacity: number }>({ text: '', opacity: 0 });

  useEffect(() => {
    // Initialize Particles
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random initial distribution
      const x = (Math.random() - 0.5) * window.innerWidth * 1.5;
      const y = (Math.random() - 0.5) * window.innerHeight * 1.5;
      const z = (Math.random() - 0.5) * 800;

      // Precalculate drift params
      const driftSpeed = 0.5 + Math.random() * 1.5;
      const phaseOffset = Math.random() * Math.PI * 2;

      // Precalculate structure target (Fibonacci Sphere)
      // We scale radius based on screen size later, so store normalized here or just recompute
      const spherePoint = getFibonacciSpherePoint(i, PARTICLE_COUNT, 1); 

      particles.push({
        id: i,
        x, y, z,
        vx: 0, vy: 0, vz: 0,
        driftOffsetX: Math.random() * 1000,
        driftOffsetY: Math.random() * 1000,
        driftSpeed,
        phaseOffset,
        targetX: spherePoint.x,
        targetY: spherePoint.y,
        targetZ: spherePoint.z,
      });
    }
    particlesRef.current = particles;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    resizeObserver.observe(canvas);

    // Animation Loop
    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      const loopedTime = elapsed % TOTAL_DURATION;
      const progress = loopedTime / TOTAL_DURATION; // 0 to 1

      // ────────────────────────────────────────────────────────────────
      // CALCULATE SYSTEM PARAMETERS
      // ────────────────────────────────────────────────────────────────

      // PHASES
      // 0.0 - 0.3: Drift (Ignorance)
      // 0.3 - 0.6: Gravity Well (Chaos/Risk)
      // 0.6 - 1.0: Structure (Stability)

      // Weights for interpolation
      const chaosWeight = smoothStep(0.25, 0.45, progress) - smoothStep(0.65, 0.8, progress);
      const structureWeight = smoothStep(0.65, 0.85, progress);
      const driftWeight = 1.0 - smoothStep(0.2, 0.4, progress);

      // Visibility adjustments for final phase
      // As the structure solidifies, we dim it slightly and expand it to clear the center for text
      const textPhase = smoothStep(0.6, 0.9, progress);
      const dimMult = lerp(1.0, 0.4, textPhase); // Reduce brightness by up to 60%
      const radiusMult = lerp(0.25, 0.38, structureWeight); // Expand from 25% to 38% of screen

      // Variables derived from weights
      const gravityStrength = chaosWeight * 0.08;
      const noiseAmplitude = driftWeight * 2 + chaosWeight * 8; // High jitter in middle
      const damping = lerp(0.96, 0.85, structureWeight); // More damping at end
      const sphereRadius = Math.min(canvas.width, canvas.height) * radiusMult;

      // Color System
      let activeColor = COLOR_NEUTRAL;
      if (chaosWeight > 0.1) activeColor = lerpColor(activeColor, COLOR_DANGER, chaosWeight);
      if (structureWeight > 0.1) activeColor = lerpColor(activeColor, COLOR_STABLE, structureWeight);

      // Rotation for the structure phase
      const rotSpeed = 0.0005 + structureWeight * 0.001;
      const rotationY = elapsed * rotSpeed;
      const rotationX = elapsed * rotSpeed * 0.5;

      // ────────────────────────────────────────────────────────────────
      // TEXT MANAGEMENT
      // ────────────────────────────────────────────────────────────────
      
      if (progress < 0.25) {
        setTextState({ text: "Кажется, всё стабильно…", opacity: smoothStep(0.05, 0.1, progress) * (1 - smoothStep(0.2, 0.25, progress)) });
      } else if (progress < 0.6) {
        setTextState({ text: "Но реальность сложнее.", opacity: smoothStep(0.3, 0.35, progress) * (1 - smoothStep(0.55, 0.6, progress)) });
      } else {
        setTextState({ text: "Guardfolio AI. Видит структуру.", opacity: smoothStep(0.65, 0.75, progress) });
      }

      // ────────────────────────────────────────────────────────────────
      // PHYSICS UPDATE
      // ────────────────────────────────────────────────────────────────
      
      // Center of screen
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      particlesRef.current.forEach(p => {
        let fx = 0, fy = 0, fz = 0;

        // 1. DRIFT FORCES (Perlin-ish noise approximation)
        if (driftWeight > 0.01) {
          const t = elapsed * 0.001;
          const noiseX = Math.sin(p.driftOffsetX + t * p.driftSpeed);
          const noiseY = Math.cos(p.driftOffsetY + t * p.driftSpeed);
          fx += noiseX * driftWeight * 0.5;
          fy += noiseY * driftWeight * 0.5;
        }

        // 2. GRAVITY WELL FORCES (Pull to center + Chaos)
        if (gravityStrength > 0.001) {
          // Pull to center
          const dx = -p.x;
          const dy = -p.y;
          const dz = -p.z;
          fx += dx * gravityStrength;
          fy += dy * gravityStrength;
          fz += dz * gravityStrength;

          // Violent Shaking
          fx += (Math.random() - 0.5) * noiseAmplitude * 20;
          fy += (Math.random() - 0.5) * noiseAmplitude * 20;
          fz += (Math.random() - 0.5) * noiseAmplitude * 20;
        }

        // 3. STRUCTURE FORCES (Pull to lattice position)
        if (structureWeight > 0.001) {
          // Rotate target point
          let tx = p.targetX * sphereRadius;
          let ty = p.targetY * sphereRadius;
          let tz = p.targetZ * sphereRadius;

          // Apply rotation matrix Y
          const cosY = Math.cos(rotationY);
          const sinY = Math.sin(rotationY);
          let rx = tx * cosY - tz * sinY;
          let rz = tx * sinY + tz * cosY;
          tx = rx; tz = rz;

          // Apply rotation matrix X
          const cosX = Math.cos(rotationX);
          const sinX = Math.sin(rotationX);
          let ry = ty * cosX - tz * sinX;
          rz = ty * sinX + tz * cosX; // update z
          ty = ry;

          // Spring force to target
          const k = 0.05 * structureWeight; // stiffness
          fx += (tx - p.x) * k;
          fy += (ty - p.y) * k;
          fz += (tz - p.z) * k;
        }

        // Integrate
        p.vx = (p.vx + fx) * damping;
        p.vy = (p.vy + fy) * damping;
        p.vz = (p.vz + fz) * damping;

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
      });

      // ────────────────────────────────────────────────────────────────
      // RENDER
      // ────────────────────────────────────────────────────────────────

      // Clear with trails
      // In the structure phase, we use a darker clear to reduce bloom/buildup
      const clearOpacity = lerp(0.2, 0.4, structureWeight);
      ctx.fillStyle = `rgba(5, 5, 8, ${clearOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set global glow
      ctx.globalCompositeOperation = 'lighter';

      // Draw Connections first
      const connectDist = lerp(150, 70, structureWeight); // Slightly shorter max dist in final
      // Reduce line opacity significantly in final phase
      const opacityMultiplier = lerp(0.1, 0.4, chaosWeight) + lerp(0, 0.15, structureWeight); 

      // Sort by Z for fake depth
      particlesRef.current.sort((a, b) => b.z - a.z);

      ctx.lineWidth = 1;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p1 = particlesRef.current[i];
        
        // Skip some checks for performance
        if (i % 2 === 0) { 
           for (let j = i + 1; j < particlesRef.current.length; j++) {
            const p2 = particlesRef.current[j];
            
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx*dx + dy*dy;
            
            const dz = p1.z - p2.z;
            if (Math.abs(dz) > 100) continue;

            if (distSq < connectDist * connectDist) {
              const dist = Math.sqrt(distSq);
              const alpha = (1 - dist / connectDist) * opacityMultiplier * dimMult;
              
              if (alpha > 0.01) {
                ctx.strokeStyle = colorToString(activeColor, alpha);
                ctx.beginPath();
                ctx.moveTo(cx + p1.x, cy + p1.y);
                ctx.lineTo(cx + p2.x, cy + p2.y);
                ctx.stroke();
              }
            }
          }
        }

        // Draw Particle
        const scale = (p1.z + 1000) / 1000; // Fake perspective scale
        const radius = Math.max(0.5, 2 * scale + (structureWeight * 1.5)); 
        
        // Base alpha reduced by dimMult in final phase
        const alpha = Math.min(1, (0.4 + scale * 0.4 + chaosWeight * 0.4) * dimMult);
        
        ctx.fillStyle = colorToString(activeColor, alpha);
        ctx.beginPath();
        ctx.arc(cx + p1.x, cy + p1.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra glow for structure nodes
        // significantly reduced intensity in final phase
        if (structureWeight > 0.5) {
             ctx.fillStyle = colorToString(activeColor, alpha * 0.15); // Reduced from 0.3
             ctx.beginPath();
             ctx.arc(cx + p1.x, cy + p1.y, radius * 3, 0, Math.PI * 2); // Reduced radius
             ctx.fill();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050508] text-white font-sans overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
         <div 
           className="text-center transition-opacity duration-100 ease-out p-8"
           style={{ opacity: textState.opacity }}
         >
           <h1 className="text-2xl md:text-4xl font-normal tracking-[0.2em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
             {textState.text}
           </h1>
           {/* Subtle decorative line */}
           <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent mx-auto mt-6" />
         </div>
      </div>

      {/* Progress Bar (Optional, subtle footer) */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-center opacity-30">
        <div className="text-xs tracking-widest uppercase font-mono text-white/60">
           System Status: <span className="text-white">Active Monitoring</span>
        </div>
      </div>
    </div>
  );
};

export default GravitationalSystem;