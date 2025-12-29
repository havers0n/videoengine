import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Particle, Phase } from '../types';

const TOTAL_DURATION = 18000; // 18 seconds
const PHASE_DURATION = 6000; // 6 seconds per phase

const FocusAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentText, setCurrentText] = useState("");
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Memoized texts for phases
  const texts = useMemo(() => [
    "Общая картина размыта.",
    "Детали имеют значение.",
    "Guardfolio. Видит всё."
  ], []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    let particles: Particle[] = [];

    // Initialize particles
    const initParticles = (width: number, height: number) => {
      const count = 60;
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          baseRadius: 10 + Math.random() * 30,
          z: 0.1 + Math.random() * 0.9, // 1 is close, 0.1 is far
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05
        });
      }
      return newParticles;
    };

    // Calculate shield formation positions
    const calculateShieldTarget = (width: number, height: number, p: Particle, total: number) => {
       // Simple shield shape parametric eq or just a grid
       const cx = width / 2;
       const cy = height / 2;
       // Normalized index
       const i = p.id;
       
       // Creating a shield contour roughly
       // Let's arrange them in a grid that is masked by a shield shape
       // Simplified: Triangle pointing down with curved top
       
       const row = Math.floor(Math.sqrt(total));
       const col = row;
       const spacing = 40;
       const xOffset = (i % col - col/2) * spacing;
       const yOffset = (Math.floor(i / col) - row/2) * spacing;
       
       return { x: cx + xOffset, y: cy + yOffset };
    };

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Handle high DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        particles = initParticles(width, height);
      }
    };

    // Initial resize
    handleResize();
    window.addEventListener('resize', handleResize);

    // --- Drawing Helpers ---

    const drawSpike = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number) => {
      const spikes = 5;
      const outerRadius = radius;
      const innerRadius = radius / 2.5;

      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        let angle = rotation + (i * Math.PI * 2) / spikes;
        ctx.lineTo(x + Math.cos(angle) * outerRadius, y + Math.sin(angle) * outerRadius);
        angle += Math.PI / spikes;
        ctx.lineTo(x + Math.cos(angle) * innerRadius, y + Math.sin(angle) * innerRadius);
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number) => {
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.2})`;
      ctx.lineWidth = 1;
      const step = 100;
      
      // Perspective illusion offset (scrolling grid)
      const offset = (Date.now() / 20) % step;

      ctx.beginPath();
      for (let x = -offset; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = -offset; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % TOTAL_DURATION;
      const cycleTime = timestamp % TOTAL_DURATION;
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Determine Phase
      let phase = Phase.BLUR;
      if (elapsed >= 6000 && elapsed < 12000) phase = Phase.SHARP;
      if (elapsed >= 12000) phase = Phase.HUD;

      // Update React state for text (only if changed)
      setPhaseIndex(phase);
      const text = texts[phase];
      setCurrentText((prev) => (prev !== text ? text : prev));

      // Clear Screen
      // Phase 1: Light gray background, Phase 2+: Dark background
      if (phase === Phase.BLUR) {
        ctx.fillStyle = '#0f172a'; // Very dark slate, almost black, but allows light particles to pop
      } else {
        ctx.fillStyle = '#000000';
      }
      ctx.fillRect(0, 0, width, height);

      // Phase 3 Grid Background
      if (phase === Phase.HUD) {
        drawGrid(ctx, width, height, 1);
      }

      // Update and Draw Particles
      particles.forEach((p) => {
        // Update Position
        if (phase === Phase.HUD && elapsed > 15000) {
           // Formation time - converge to shield/logo
           const target = calculateShieldTarget(width, height, p, particles.length);
           // Lerp
           const lerpFactor = 0.05;
           p.x += (target.x - p.x) * lerpFactor;
           p.y += (target.y - p.y) * lerpFactor;
        } else {
            // Brownian drift
            p.x += p.vx * (phase === Phase.SHARP ? 2 : 1); // Move faster in danger mode
            p.y += p.vy * (phase === Phase.SHARP ? 2 : 1);
            p.rotation += p.rotationSpeed * (phase === Phase.SHARP ? 5 : 1);
        }

        // Boundary wrap
        if (p.x < -100) p.x = width + 100;
        if (p.x > width + 100) p.x = -100;
        if (p.y < -100) p.y = height + 100;
        if (p.y > height + 100) p.y = -100;

        // Draw based on Phase
        ctx.save();
        
        if (phase === Phase.BLUR) {
          // BOKEH EFFECT
          // Simulating Bokeh with globalAlpha and radial gradients
          // High blur filter is expensive, so we simulate it with gradients for better FPS on 60 particles
          
          const blurAmount = 4 + (1 - p.z) * 10; // Depth of field simulation
          // ctx.filter = `blur(${blurAmount}px)`; // Can be performance heavy, let's use gradient soft edges
          
          // Soft Orb
          const opacity = 0.3 + p.z * 0.3;
          ctx.globalAlpha = opacity;
          
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.baseRadius * 2);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          gradient.addColorStop(0.5, 'rgba(200, 200, 210, 0.2)');
          gradient.addColorStop(1, 'rgba(200, 200, 210, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.baseRadius * 2, 0, Math.PI * 2);
          ctx.fill();

        } else if (phase === Phase.SHARP) {
          // SHARP DANGEROUS SPIKES
          ctx.filter = 'none';
          ctx.fillStyle = '#ef4444'; // Red-500
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 10;
          ctx.globalAlpha = 0.8 + p.z * 0.2;
          
          drawSpike(ctx, p.x, p.y, p.baseRadius * 0.8, p.rotation);

        } else if (phase === Phase.HUD) {
          // TACTICAL UI
          ctx.filter = 'none';
          
          // The object itself
          ctx.fillStyle = '#06b6d4'; // Cyan-500
          ctx.shadowColor = '#0891b2';
          ctx.shadowBlur = 5;
          ctx.globalAlpha = 0.6;
          
          // Draw a small geometric core instead of spike
          ctx.beginPath();
          ctx.rect(p.x - 4, p.y - 4, 8, 8);
          ctx.fill();

          // HUD Box Overlay
          ctx.strokeStyle = '#22d3ee'; // Cyan-400
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.8;
          ctx.shadowBlur = 0;
          
          const boxSize = p.baseRadius * 1.5;
          ctx.strokeRect(p.x - boxSize, p.y - boxSize, boxSize * 2, boxSize * 2);
          
          // Connecting lines to neighbors (only close ones)
          particles.forEach(other => {
             const dx = p.x - other.x;
             const dy = p.y - other.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 100 && dist > 0) {
                 ctx.beginPath();
                 ctx.moveTo(p.x, p.y);
                 ctx.lineTo(other.x, other.y);
                 ctx.strokeStyle = `rgba(6, 182, 212, ${1 - dist/100})`;
                 ctx.stroke();
             }
          });
          
          // Data Text
          ctx.fillStyle = '#22d3ee';
          ctx.font = '10px "JetBrains Mono"';
          if (p.id % 3 === 0) {
             ctx.fillText(`TRGT-${p.id}`, p.x + boxSize + 2, p.y - boxSize);
          }
        }
        
        ctx.restore();
      });

      // Global HUD Overlay effects (Vignette or Scanlines)
      if (phase === Phase.HUD) {
          const grad = ctx.createRadialGradient(width/2, height/2, height/3, width/2, height/2, height);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,20,40,0.5)');
          ctx.fillStyle = grad;
          ctx.fillRect(0,0,width,height);
          
          // Scanline
          const scanY = (Date.now() / 5) % height;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
          ctx.fillRect(0, scanY, width, 5);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [texts]);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block absolute inset-0" />
      
      {/* Text Overlay Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative z-10 text-center transition-all duration-700 ease-out transform">
          <h1 
            key={currentText} // Key change triggers animation
            className={`
              text-4xl md:text-6xl font-extrabold tracking-tight animate-fade-in-up
              ${phaseIndex === Phase.BLUR ? 'text-gray-200 blur-[2px] opacity-70' : ''}
              ${phaseIndex === Phase.SHARP ? 'text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] scale-110' : ''}
              ${phaseIndex === Phase.HUD ? 'text-cyan-400 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]' : ''}
            `}
          >
            {currentText}
          </h1>
          
          {phaseIndex === Phase.HUD && (
            <div className="mt-4 text-cyan-700 font-mono text-sm animate-pulse">
              [ SYSTEM ONLINE // MONITORING ACTIVE ]
            </div>
          )}
        </div>
      </div>
      
      {/* HUD Vignette Static Overlay */}
      {phaseIndex === Phase.HUD && (
          <div className="absolute inset-0 pointer-events-none border-[20px] border-cyan-900/10 rounded-lg shadow-[inset_0_0_100px_rgba(6,182,212,0.2)]" />
      )}
      
      {/* Progress Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-1 bg-gray-800 rounded overflow-hidden">
        <div 
            className={`h-full transition-colors duration-300
                ${phaseIndex === Phase.BLUR ? 'bg-white' : ''}
                ${phaseIndex === Phase.SHARP ? 'bg-red-600' : ''}
                ${phaseIndex === Phase.HUD ? 'bg-cyan-500' : ''}
            `}
            style={{ 
                width: '100%',
                animation: `progress 18s linear infinite` 
            }} 
        />
      </div>

      <style>{`
        @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(0%); }
        }
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default FocusAnimation;