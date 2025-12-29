import React, { useRef, useEffect, useState } from 'react';
import { Particle, AnimationPhase, COLORS, CONFIG } from '../types';
import { PHASES } from '../constants';

const PromoAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AnimationPhase>(AnimationPhase.ILLUSION);
  
  // Mutable state for performance (avoiding React renders for 60fps logic)
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  // Initialize particles
  const initParticles = (width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        originX: 0,
        originY: 0,
        targetX: 0,
        targetY: 0,
        color: COLORS.STABLE,
        isScanned: false,
      });
    }
    particlesRef.current = particles;
    calculateShieldTargets(width, height);
  };

  // Calculate the "Shield" / Hex grid formation for Phase 3 & 4
  const calculateShieldTargets = (width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const spacing = Math.min(width, height) * 0.08;
    const particles = particlesRef.current;
    
    // Simple hexagonal packing spiral
    let count = 0;
    let layer = 0;
    
    // Center point
    if (particles[0]) {
      particles[0].targetX = cx;
      particles[0].targetY = cy;
      count++;
    }

    while (count < particles.length) {
      layer++;
      // Hexagonal rings
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < layer; j++) {
           if (count >= particles.length) break;
           
           // Math for hex corner + offset along edge
           const angle = (Math.PI / 3) * i;
           const nextAngle = (Math.PI / 3) * ((i + 1) % 6);
           
           const x1 = cx + Math.cos(angle) * spacing * layer;
           const y1 = cy + Math.sin(angle) * spacing * layer;
           
           const x2 = cx + Math.cos(nextAngle) * spacing * layer;
           const y2 = cy + Math.sin(nextAngle) * spacing * layer;

           // Interpolate along the edge
           const factor = j / layer;
           particles[count].targetX = x1 + (x2 - x1) * factor;
           particles[count].targetY = y1 + (y2 - y1) * factor;
           count++;
        }
      }
    }
  };

  const animate = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const loopTime = elapsed % CONFIG.CYCLE_DURATION;
    
    // Determine Phase
    const currentPhaseIndex = Math.floor(loopTime / CONFIG.PHASE_DURATION);
    const phaseTime = loopTime % CONFIG.PHASE_DURATION; // Time within current phase
    
    // Update React State only if changed
    setPhase(prev => {
        if (prev !== currentPhaseIndex) return currentPhaseIndex;
        return prev;
    });

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const width = canvas.width;
      const height = canvas.height;

      // 1. CLEAR & BACKGROUND
      ctx.globalCompositeOperation = 'source-over';
      // Slight trail effect in Phase 2 for chaos, otherwise clear
      ctx.fillStyle = currentPhaseIndex === AnimationPhase.RISK ? 'rgba(5, 5, 5, 0.3)' : 'rgba(5, 5, 5, 1)';
      ctx.fillRect(0, 0, width, height);

      // 2. PHASE SPECIFIC RENDERING EFFECTS
      
      // -- Phase 2: Glitch Effect (Whole Canvas Shift) --
      if (currentPhaseIndex === AnimationPhase.RISK) {
        if (Math.random() > 0.92) {
            const shiftX = (Math.random() - 0.5) * 20;
            ctx.save();
            ctx.translate(shiftX, 0);
        }
      }

      // -- Phase 3: Scanline -- 
      let scanY = -100;
      if (currentPhaseIndex === AnimationPhase.SOLUTION) {
         scanY = (phaseTime / 3000) * height; // Scans fully in first 3s of phase
         
         // Draw Scanline
         if (scanY < height) {
            const gradient = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
            gradient.addColorStop(0, 'rgba(0, 229, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 229, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, scanY - 50, width, 100);
         }
      }

      // 3. PARTICLE PHYSICS LOOP
      const particles = particlesRef.current;

      ctx.lineWidth = 1;
      
      // Pre-loop: Reset 'isScanned' if we looped back to Phase 1
      if (currentPhaseIndex === AnimationPhase.ILLUSION && phaseTime < 100) {
          particles.forEach(p => { p.isScanned = false; p.color = COLORS.STABLE; });
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // --- PHASE 1: ILLUSION (Float) ---
        if (currentPhaseIndex === AnimationPhase.ILLUSION) {
          p.x += p.vx;
          p.y += p.vy;
          p.color = COLORS.STABLE;
          
          // Bounce off edges gently
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }

        // --- PHASE 2: RISK (Clump & Jitter) ---
        else if (currentPhaseIndex === AnimationPhase.RISK) {
          p.color = COLORS.RISK;
          
          // Strong pull to center (Gravity)
          const dx = (width / 2) - p.x;
          const dy = (height / 2) - p.y;
          p.x += dx * 0.02; 
          p.y += dy * 0.02;

          // Nervous vibration
          p.x += (Math.random() - 0.5) * 4;
          p.y += (Math.random() - 0.5) * 4;
        }

        // --- PHASE 3: SOLUTION (Scan & Organize) ---
        else if (currentPhaseIndex === AnimationPhase.SOLUTION) {
           // Check scanline
           if (!p.isScanned && p.y < scanY) {
               p.isScanned = true;
           }

           if (p.isScanned) {
               p.color = COLORS.AI;
               // Lerp to target
               p.x += (p.targetX - p.x) * 0.1;
               p.y += (p.targetY - p.y) * 0.1;
           } else {
               // Still chaotic red before scan hits
               p.color = COLORS.RISK;
               p.x += (Math.random() - 0.5) * 2;
               p.y += (Math.random() - 0.5) * 2;
           }
        }

        // --- PHASE 4: BRANDING (Shield Pulse) ---
        else if (currentPhaseIndex === AnimationPhase.BRANDING) {
            p.color = COLORS.AI;
            // Gentle Pulse from center
            const pulse = Math.sin(phaseTime * 0.003) * 5;
            
            // Maintain formation
            const tx = p.targetX + (p.targetX - width/2) * (pulse * 0.01);
            const ty = p.targetY + (p.targetY - height/2) * (pulse * 0.01);

            p.x += (tx - p.x) * 0.1;
            p.y += (ty - p.y) * 0.1;
        }

        // DRAW PARTICLE
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentPhaseIndex === AnimationPhase.BRANDING ? 3 : 2, 0, Math.PI * 2);
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for lines

        // DRAW CONNECTIONS (Phase 2 & 4 only)
        if (currentPhaseIndex === AnimationPhase.RISK) {
            // Chaotic connections to neighbors
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(255, 68, 68, ${1 - dist / 150})`;
                    ctx.stroke();
                }
            }
        } 
        
        if (currentPhaseIndex === AnimationPhase.BRANDING || (currentPhaseIndex === AnimationPhase.SOLUTION && p.isScanned)) {
            // Structured connections
            // Connect to particles that are close in the target grid
             for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                // Check distance between current positions
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                // Also check distance between intended targets to only draw "valid" structural lines
                const targetDist = Math.hypot(p.targetX - p2.targetX, p.targetY - p2.targetY);
                
                const maxDist = Math.min(width, height) * 0.12;

                if (dist < maxDist && targetDist < maxDist && p.isScanned && p2.isScanned) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(0, 229, 255, 0.15)`; // Faint grid lines
                    ctx.stroke();
                }
            }
        }
      }

      // Restore context after potential glitch translation
      if (currentPhaseIndex === AnimationPhase.RISK) {
         ctx.restore();
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        initParticles(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Text transition helper
  const renderText = () => {
    return PHASES.map((p, index) => (
       <div
        key={index}
        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out px-4 text-center ${
            phase === index ? 'opacity-100' : 'opacity-0'
        }`}
       >
         <h1 className={`text-4xl md:text-6xl font-bold font-data tracking-widest mb-4 ${p.color} drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]`}>
           {p.title}
         </h1>
         <p className="text-gray-400 font-data text-xl md:text-2xl tracking-wide max-w-2xl">
           {p.subtitle}
         </p>
       </div>
    ));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
        {/* Canvas Layer */}
        <canvas ref={canvasRef} className="absolute inset-0 block" />
        
        {/* Vignette Overlay for Cinematic look */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.8)_100%)]"></div>

        {/* Text Layer */}
        <div className="absolute inset-0 pointer-events-none z-10">
            {renderText()}
        </div>

        {/* Progress Bar (Optional visual cue) */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent w-full opacity-30 animate-pulse"></div>
    </div>
  );
};

export default PromoAnimation;