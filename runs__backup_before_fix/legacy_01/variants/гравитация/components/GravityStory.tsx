import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONFIG, Particle, StoryPhase } from '../types';

// Utility for random range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const GravityStory: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const shakeIntensity = useRef<number>(0);

  const [phase, setPhase] = useState<StoryPhase>(StoryPhase.ORBIT);
  const [timeProgress, setTimeProgress] = useState(0);

  // Initialize particles
  const initParticles = (width: number, height: number) => {
    const newParticles: Particle[] = [];
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.25;

    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      // Start in a ring for the Orbit phase
      const angle = (i / CONFIG.PARTICLE_COUNT) * Math.PI * 2;
      // Add slight randomness to orbit radius for organic feel
      const r = radius + randomRange(-10, 10); 
      
      newParticles.push({
        id: i,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: -Math.sin(angle) * 2, // Tangent velocity
        vy: Math.cos(angle) * 2,
        radius: randomRange(1.5, 3),
        color: CONFIG.COLORS.SAFE,
        history: [],
        locked: false,
      });
    }
    particlesRef.current = newParticles;
  };

  // Determine Pyramid Targets for Levitation Phase
  const calculatePyramidTargets = (width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const spacing = 12;
    const particles = particlesRef.current;
    
    // Simple triangle packing
    let currentIdx = 0;
    let row = 0;
    // We want the pyramid to be somewhat centered vertically
    const startY = cy - 100; 

    while (currentIdx < particles.length) {
      const itemsInRow = row + 1;
      const rowWidth = (itemsInRow - 1) * spacing;
      const startX = cx - rowWidth / 2;

      for (let i = 0; i < itemsInRow; i++) {
        if (currentIdx >= particles.length) break;
        
        particles[currentIdx].targetX = startX + i * spacing;
        particles[currentIdx].targetY = startY + row * spacing * 0.866; // Hex height
        currentIdx++;
      }
      row++;
    }
  };

  const updatePhysics = (
    width: number, 
    height: number, 
    currentPhase: StoryPhase, 
    deltaTime: number
  ) => {
    const cx = width / 2;
    const cy = height / 2;
    
    // Decay shake
    shakeIntensity.current *= 0.9;

    particlesRef.current.forEach((p) => {
      // Store history for trails
      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > CONFIG.TRAIL_LENGTH) {
        p.history.shift();
      }

      // Phase 1: ORBIT (0-6s)
      if (currentPhase === StoryPhase.ORBIT) {
        p.color = CONFIG.COLORS.SAFE;
        
        // Attraction to center ring + Tangent Velocity maintenance
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetRadius = Math.min(width, height) * 0.25;
        
        // Gentle spring to ring radius
        const force = (targetRadius - dist) * 0.005;
        const angle = Math.atan2(dy, dx);
        
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;

        // Add tangent force to keep them spinning
        p.vx += -Math.sin(angle) * 0.05;
        p.vy += Math.cos(angle) * 0.05;

        // Damping to prevent explosion
        p.vx *= 0.99;
        p.vy *= 0.99;
      }

      // Phase 2: COLLAPSE (6-12s)
      else if (currentPhase === StoryPhase.COLLAPSE) {
        // Transition color to RED
        // Simple lerp-ish by just setting it (simulation loop is fast enough)
        p.color = CONFIG.COLORS.RISK;

        // Heavy Gravity
        p.vy += 0.8; // Gravity constant
        p.vx *= 0.99; // Air resistance

        // Floor collision
        if (p.y + p.radius > height) {
          p.y = height - p.radius;
          p.vy *= -0.6; // Bounce with energy loss
          p.vx *= 0.8; // Floor friction
          
          // Add chaos on impact
          p.vx += randomRange(-2, 2);

          // Trigger camera shake on high impact
          if (Math.abs(p.vy) > 10) {
            shakeIntensity.current = Math.min(shakeIntensity.current + 0.5, 20);
          }
        }

        // Wall collision
        if (p.x < 0 || p.x > width) {
          p.vx *= -0.8;
          p.x = Math.max(0, Math.min(width, p.x));
        }
      }

      // Phase 3: LEVITATION (12-18s)
      else if (currentPhase === StoryPhase.LEVITATION) {
        p.color = CONFIG.COLORS.GUARD;

        if (p.targetX !== undefined && p.targetY !== undefined) {
          // Spring force to target
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          
          p.vx += dx * 0.05;
          p.vy += dy * 0.05;

          // Strong damping to "lock" in place
          p.vx *= 0.85;
          p.vy *= 0.85;

          // "Lock" visually if close enough (optional visual tweak, not strict physics)
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
             p.locked = true;
             p.x = p.targetX;
             p.y = p.targetY;
          }
        }
      }

      // Apply velocity
      if (!p.locked) {
        p.x += p.vx;
        p.y += p.vy;
      }
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear with trail effect (optional, but pure clear is cleaner for this style)
    ctx.fillStyle = 'rgba(10, 10, 16, 1)'; // Deep space bg
    ctx.fillRect(0, 0, width, height);

    // Apply Shake
    ctx.save();
    if (shakeIntensity.current > 0.1) {
      const dx = (Math.random() - 0.5) * shakeIntensity.current;
      const dy = (Math.random() - 0.5) * shakeIntensity.current;
      ctx.translate(dx, dy);
    }

    // Draw Particles
    particlesRef.current.forEach((p) => {
      // Draw Trail
      if (p.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        ctx.strokeStyle = p.color;
        // Fade out tail
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Head
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      
      // Add glow for active elements
      if (phase === StoryPhase.LEVITATION || phase === StoryPhase.ORBIT) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      } else {
         ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0; // Reset
    });

    ctx.restore();
  };

  const animate = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    
    // Loop every 18 seconds
    const elapsed = timestamp - startTimeRef.current;
    const cycleTime = elapsed % (CONFIG.PHASE_DURATION * 3);
    const totalDuration = CONFIG.PHASE_DURATION * 3;
    
    // Update progress (0 to 100)
    setTimeProgress((cycleTime / totalDuration) * 100);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Determine Phase
    let nextPhase = StoryPhase.ORBIT;
    if (cycleTime >= CONFIG.PHASE_DURATION && cycleTime < CONFIG.PHASE_DURATION * 2) {
      nextPhase = StoryPhase.COLLAPSE;
    } else if (cycleTime >= CONFIG.PHASE_DURATION * 2) {
      nextPhase = StoryPhase.LEVITATION;
    }

    // State Transition Logic
    if (nextPhase !== phase) {
      setPhase(nextPhase);
      
      // Reset logic if wrapping around or changing phases specifically
      if (nextPhase === StoryPhase.ORBIT && cycleTime < 100) {
        initParticles(width, height);
      }
      
      // One-time setup for levitation targets
      if (nextPhase === StoryPhase.LEVITATION) {
        calculatePyramidTargets(width, height);
      }
    }
    
    // Special reset if we just wrapped around to 0 but phase didn't catch it yet
    if (elapsed > 100 && cycleTime < 100 && phase !== StoryPhase.ORBIT) {
        setPhase(StoryPhase.ORBIT);
        initParticles(width, height);
    }

    updatePhysics(width, height, nextPhase, 16); // assume ~60fps, delta 16ms
    draw(ctx, width, height);

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        // Re-init on resize to keep things centered
        initParticles(canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]); // Dependency on phase isn't strictly needed for anim loop but helps Reset

  // Text Content based on Phase
  const content = useMemo(() => {
    switch (phase) {
      case StoryPhase.ORBIT:
        return {
          title: "Баланс кажется идеальным.",
          color: "text-white",
          sub: "0% Риска",
        };
      case StoryPhase.COLLAPSE:
        return {
          title: "Но гравитация рынка беспощадна.",
          color: "text-red-500",
          sub: "Критическая Волатильность",
        };
      case StoryPhase.LEVITATION:
        return {
          title: "Guardfolio. Контроль над падением.",
          color: "text-cyan-400",
          sub: "Защита Активов",
        };
    }
  }, [phase]);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#0a0a10] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center z-10 p-6"
          >
             <h2 className={`text-sm font-mono tracking-widest uppercase mb-2 ${content.color} opacity-70`}>
              {content.sub}
            </h2>
            <h1 className={`text-4xl md:text-6xl font-bold tracking-tight ${content.color} drop-shadow-2xl`}>
              {content.title}
            </h1>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-10 left-10 right-10 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div 
            className="h-full bg-white/50"
            style={{ width: `${timeProgress}%` }}
        />
      </div>

      {/* Phase Indicators */}
      <div className="absolute top-10 right-10 flex gap-4 text-xs font-mono text-white/40">
        <div className={phase === StoryPhase.ORBIT ? 'text-white' : ''}>01. ORBIT</div>
        <div className={phase === StoryPhase.COLLAPSE ? 'text-red-500' : ''}>02. COLLAPSE</div>
        <div className={phase === StoryPhase.LEVITATION ? 'text-cyan-400' : ''}>03. GUARD</div>
      </div>
      
      {/* Restart Button (User Control) */}
      <button 
        onClick={() => {
            startTimeRef.current = performance.now();
            setPhase(StoryPhase.ORBIT);
            const canvas = canvasRef.current;
            if(canvas) initParticles(canvas.width, canvas.height);
        }}
        className="absolute bottom-10 right-10 pointer-events-auto bg-white/5 hover:bg-white/10 text-white/50 hover:text-white px-4 py-2 rounded border border-white/10 transition-colors text-xs font-mono uppercase"
      >
        Replay Sequence
      </button>
    </div>
  );
};

export default GravityStory;