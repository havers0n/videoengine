import React, { useEffect, useRef, useState } from 'react';
import { AnimationPhase, Point, Particle } from '../types';

const PHASE_DURATION = 5000; // 5 seconds per phase
const TOTAL_CYCLE = 15000; // 15 seconds total

interface SonarCanvasProps {
  onPhaseChange: (phase: AnimationPhase) => void;
}

const SonarCanvas: React.FC<SonarCanvasProps> = ({ onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Simulation state refs (mutable without re-renders)
  const pointsRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Initialize data
  useEffect(() => {
    const initSimulation = (width: number, height: number) => {
      // Create Market Nodes
      const pointCount = Math.floor((width * height) / 15000);
      const newPoints: Point[] = [];
      for (let i = 0; i < pointCount; i++) {
        newPoints.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          phaseOffset: Math.random() * Math.PI * 2,
        });
      }
      pointsRef.current = newPoints;

      // Create Dust Particles
      const particleCount = 100;
      const newParticles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.5,
          speed: Math.random() * 0.2 + 0.1,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
      particlesRef.current = newParticles;
    };

    if (containerRef.current) {
      initSimulation(containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Animation Loop
    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const cycleTime = elapsed % TOTAL_CYCLE;
      
      // Determine Phase
      let currentPhase = AnimationPhase.VOID;
      let phaseProgress = 0; // 0 to 1

      if (cycleTime < PHASE_DURATION) {
        currentPhase = AnimationPhase.VOID;
        phaseProgress = cycleTime / PHASE_DURATION;
      } else if (cycleTime < PHASE_DURATION * 2) {
        currentPhase = AnimationPhase.REVEAL;
        phaseProgress = (cycleTime - PHASE_DURATION) / PHASE_DURATION;
      } else {
        currentPhase = AnimationPhase.CLARITY;
        phaseProgress = (cycleTime - PHASE_DURATION * 2) / PHASE_DURATION;
      }
      
      // Notify parent for text updates (debounced naturally by React state updates usually, but here we call raw)
      // Ideally we check if changed, but for simplicity relying on parent to handle dedupe or just state set
      onPhaseChange(currentPhase);

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // --- CLEAR & BACKGROUND ---
      // Use a slight trail effect in VOID and REVEAL, but clear fully in CLARITY for crisp lines
      if (currentPhase === AnimationPhase.CLARITY) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.3)'; // Trails
        ctx.fillRect(0, 0, width, height);
      }

      // --- UPDATE ENTITIES ---
      pointsRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });

      particlesRef.current.forEach(p => {
        p.y -= p.speed;
        if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
        }
      });

      // --- RENDER PHASES ---
      ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

      // 1. Draw Dust (Always visible but subtle)
      ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
      particlesRef.current.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (currentPhase === AnimationPhase.VOID) {
        renderVoidPhase(ctx, width, height, cycleTime, pointsRef.current);
      } else if (currentPhase === AnimationPhase.REVEAL) {
        renderRevealPhase(ctx, width, height, cycleTime, pointsRef.current, phaseProgress);
      } else if (currentPhase === AnimationPhase.CLARITY) {
        renderClarityPhase(ctx, width, height, pointsRef.current, phaseProgress);
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [onPhaseChange]);

  // --- PHASE RENDERERS ---

  const renderVoidPhase = (
    ctx: CanvasRenderingContext2D, 
    w: number, 
    h: number, 
    time: number, 
    points: Point[]
  ) => {
    const cx = w / 2;
    const cy = h / 2;

    // Radar Sweep
    const sweepSpeed = 0.001;
    const angle = (time * sweepSpeed) % (Math.PI * 2);
    
    // Draw Radar Gradient
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = gradient;
    // Draw a pie slice or just a rotating beam? Let's do a scanning beam.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.max(w, h), -0.2, 0.2); 
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Faint Nodes
    points.forEach(p => {
      const dist = Math.hypot(p.x - cx, p.y - cy);
      // Nodes light up briefly if the "radar" angle passes them.
      // Calculate angle to point
      const pAngle = Math.atan2(p.y - cy, p.x - cx);
      let diff = angle - pAngle;
      // Normalize angle diff
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      const isIlluminated = Math.abs(diff) < 0.3;
      const opacity = isIlluminated ? 0.8 : 0.05; // Very faint normally
      
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isIlluminated ? p.radius * 1.5 : p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const renderRevealPhase = (
    ctx: CanvasRenderingContext2D, 
    w: number, 
    h: number, 
    time: number, 
    points: Point[],
    progress: number
  ) => {
    // Pulse background red
    const pulse = Math.sin(time * 0.005) * 0.5 + 0.5;
    
    // Background warning gradient
    const bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
    bgGrad.addColorStop(0, `rgba(50, 0, 0, ${0.1 * pulse})`);
    bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0,0,w,h);

    // Draw Chaotic Connections
    ctx.lineWidth = 1;
    const connectDist = 150;
    
    // Animate lines appearing
    const maxConnections = points.length * progress; 

    // Naive connection drawing (can be optimized but fine for < 200 points)
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        
        // Draw the node "hot"
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'red';
        ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        for (let j = i + 1; j < points.length; j++) {
            const p2 = points[j];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < connectDist) {
                // Line opacity flickers
                const alpha = (1 - dist / connectDist) * (Math.random() * 0.5 + 0.5);
                ctx.strokeStyle = `rgba(255, 20, 20, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
  };

  const renderClarityPhase = (
    ctx: CanvasRenderingContext2D, 
    w: number, 
    h: number, 
    points: Point[],
    progress: number
  ) => {
    // Scanner Position (moves left to right)
    const scannerX = w * progress;

    // --- LEFT SIDE: CLARITY (CYAN GRID) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, scannerX, h);
    ctx.clip(); // Restrict drawing to left side

    // Draw Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    
    // Vertical lines
    for(let x = 0; x <= scannerX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    // Horizontal lines
    for(let y = 0; y <= h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(scannerX, y);
        ctx.stroke();
    }

    // Draw Clean Nodes (Snapped to grid purely visually or just calm blue)
    points.forEach(p => {
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw neat connections to nearest grid points? 
        // Let's just draw simple clean connections to neighbors
        // But only strict geometry
    });
    ctx.restore();


    // --- RIGHT SIDE: CHAOS (RED WEB) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(scannerX, 0, w - scannerX, h);
    ctx.clip(); // Restrict drawing to right side

    // Draw the chaos from Reveal phase (fading out)
    const connectDist = 150;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        if (p1.x < scannerX - 50) continue; // Optimization

        ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
            const p2 = points[j];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < connectDist) {
                ctx.strokeStyle = `rgba(255, 20, 20, ${1 - dist/connectDist})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
    ctx.restore();


    // --- SCANNER LINE ---
    const scanGradient = ctx.createLinearGradient(scannerX - 20, 0, scannerX + 20, 0);
    scanGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
    scanGradient.addColorStop(0.5, 'rgba(0, 255, 255, 1)');
    scanGradient.addColorStop(1, 'rgba(255, 50, 50, 0)'); // Blend into red side
    
    ctx.fillStyle = scanGradient;
    ctx.fillRect(scannerX - 2, 0, 4, h);
    
    // Scanner Glow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(scannerX - 1, 0, 2, h);
    ctx.shadowBlur = 0;
  };

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0 z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SonarCanvas;
