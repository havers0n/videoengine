import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Particle, AnimationPhase } from '../types';

// Configuration
const GRID_ROWS = 12;
const GRID_COLS = 20;
const DURATION_MS = 18000;
const PHASE_1_END = 6000;
const PHASE_2_END = 12000;

const DarkPoolCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AnimationPhase>(AnimationPhase.VOID);
  const [timeMs, setTimeMs] = useState(0);

  // Generate particles only once on mount (or resize, but we keep it simple for now)
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Initialize Particle System
  useEffect(() => {
    if (!containerRef.current) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const particles: Particle[] = [];
    const cellWidth = width / (GRID_COLS + 1);
    const cellHeight = height / (GRID_ROWS + 1);
    
    // Create Grid layout first to establish topology
    let idCounter = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        // Target Position (Clean Grid)
        const targetX = (c + 1) * cellWidth;
        const targetY = (r + 1) * cellHeight;

        // Start Position (Random Chaos) - heavily randomized but kept somewhat central to ensure density
        const startX = (Math.random() * width * 0.8) + (width * 0.1);
        const startY = (Math.random() * height * 0.8) + (height * 0.1);

        particles.push({
          id: idCounter++,
          x: startX,
          y: startY,
          startX,
          startY,
          targetX,
          targetY,
          neighbors: [], // Will fill next
          size: Math.random() * 2 + 1,
        });
      }
    }

    // Connect neighbors based on GRID topology (Right and Bottom)
    // This ensures that when they "untangle", it forms a perfect net.
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const i = r * GRID_COLS + c;
        
        // Connect Right
        if (c < GRID_COLS - 1) {
          particles[i].neighbors.push(i + 1);
        }
        // Connect Bottom
        if (r < GRID_ROWS - 1) {
          particles[i].neighbors.push(i + GRID_COLS);
        }
      }
    }

    particlesRef.current = particles;
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      // Loop or Clamp? The prompt implies an 18s sequence. Let's clamp at end.
      const t = Math.min(elapsed, DURATION_MS);
      setTimeMs(t);

      // Determine Phase
      let currentPhase = AnimationPhase.VOID;
      if (t > PHASE_1_END && t <= PHASE_2_END) currentPhase = AnimationPhase.PING;
      else if (t > PHASE_2_END) currentPhase = AnimationPhase.CLARITY;
      
      // Update React state for HUD only if changed
      setPhase((prev) => prev !== currentPhase ? currentPhase : prev);

      // --- DRAWING ---
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;

      // 1. Clear & Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // 2. Physics & Logic Updates
      particlesRef.current.forEach(p => {
        // Phase 3: Interpolate to Grid
        if (currentPhase === AnimationPhase.CLARITY) {
          const scanProgress = (t - PHASE_2_END) / (DURATION_MS - PHASE_2_END);
          const scanX = w * (scanProgress * 1.2); // 1.2 speed multiplier to ensure it clears screen

          // If scanner passed this particle, snap to grid
          if (p.x < scanX) {
            // Lerp towards target
            p.x += (p.targetX - p.x) * 0.1;
            p.y += (p.targetY - p.y) * 0.1;
          } else {
             // Slowly drift in chaos before scanned
             p.x += (Math.random() - 0.5) * 0.5;
             p.y += (Math.random() - 0.5) * 0.5;
          }
        } else {
            // Slight Brownian motion in Void/Ping
            p.x += (Math.random() - 0.5) * 0.2;
            p.y += (Math.random() - 0.5) * 0.2;
        }
      });

      // 3. Render Layers
      
      // --- PHASE 1: THE VOID (Radar) ---
      if (currentPhase === AnimationPhase.VOID || t < PHASE_1_END + 1000) {
        // Radar Sweep Angle
        const sweepSpeed = 0.002;
        const angle = (t * sweepSpeed) % (Math.PI * 2);

        // Draw Radar Gradient
        const gradient = ctx.createConicGradient(angle + Math.PI/2, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.8, 'rgba(30, 40, 50, 0.05)');
        gradient.addColorStop(1, 'rgba(200, 220, 255, 0.1)'); // Leading edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(w, h), 0, Math.PI * 2);
        ctx.fill();

        // Draw Particles (Only if lit by radar)
        particlesRef.current.forEach(p => {
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const pAngle = Math.atan2(dy, dx) + Math.PI; // 0 to 2PI normalizer
          const normalizedSweep = (angle + Math.PI) % (Math.PI * 2); // adjust for atan2 phase
          
          // Simple angular distance check
          let angleDiff = Math.abs(pAngle - normalizedSweep);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          
          if (angleDiff < 0.3) {
            const opacity = 1 - (angleDiff / 0.3);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // --- PHASE 2: THE PING (Red Tangled Web) ---
      if (currentPhase === AnimationPhase.PING || (currentPhase === AnimationPhase.CLARITY && t < DURATION_MS)) {
        // Transition fade in/out
        let phaseAlpha = 1;
        if (t < PHASE_1_END + 500) phaseAlpha = (t - PHASE_1_END) / 500;
        
        // In Clarity phase, the red chaos exists only to the right of the scanner
        // We handle that per-particle/line below.

        ctx.lineWidth = 1;
        const pulse = Math.sin(t * 0.01) * 0.5 + 0.5; // 0 to 1

        particlesRef.current.forEach(p => {
          // Optimization: Only draw connections if particle is visible or active
          // In Clarity phase, if p is organized, we draw Blue, if chaotic, we draw Red.
          
          const isOrganized = currentPhase === AnimationPhase.CLARITY && 
                             p.x < (w * ((t - PHASE_2_END) / (DURATION_MS - PHASE_2_END)) * 1.2);

          p.neighbors.forEach(nId => {
            const neighbor = particlesRef.current[nId];
            
            // Logic for line color/style
            if (isOrganized) {
                // Already processed in blue loop below? Or handle here.
                // Let's handle blue grid separately to ensure clean layering.
                return; 
            }

            // RED CHAOS LINES
            const dist = Math.hypot(p.x - neighbor.x, p.y - neighbor.y);
            const opacity = Math.min(1, 100 / dist) * phaseAlpha; // Long lines are dimmer
            
            if (opacity > 0.05) {
                // Chromatic Aberration / Jitter
                const jitter = (Math.random() - 0.5) * 2;
                
                ctx.strokeStyle = `rgba(255, 50, 50, ${opacity * 0.8})`;
                ctx.beginPath();
                ctx.moveTo(p.x + jitter, p.y + jitter);
                ctx.lineTo(neighbor.x - jitter, neighbor.y - jitter);
                ctx.stroke();

                // Occasional "Glitch" line
                if (Math.random() > 0.995) {
                   ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`;
                   ctx.beginPath();
                   ctx.moveTo(p.x + 5, p.y);
                   ctx.lineTo(neighbor.x + 5, neighbor.y);
                   ctx.stroke();
                }
            }
          });

          // Draw "Risk" Nodes
          if (!isOrganized) {
              ctx.fillStyle = `rgba(255, 0, 0, ${pulse * phaseAlpha})`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * (Math.random() > 0.9 ? 1.5 : 1), 0, Math.PI * 2);
              ctx.fill();
          }
        });
      }

      // --- PHASE 3: CLARITY (Blue Grid) ---
      if (currentPhase === AnimationPhase.CLARITY) {
        const scanProgress = (t - PHASE_2_END) / (DURATION_MS - PHASE_2_END);
        const scanX = w * (scanProgress * 1.2);

        // Draw Scanner Bar
        const grad = ctx.createLinearGradient(scanX - 50, 0, scanX, 0);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
        grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
        grad.addColorStop(1, 'rgba(0, 255, 255, 0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(scanX - 100, 0, 100, h);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, h);
        ctx.stroke();

        // Draw Organized Grid
        ctx.lineWidth = 1;
        particlesRef.current.forEach(p => {
          if (p.x < scanX) {
              // Draw Connections Blue
              p.neighbors.forEach(nId => {
                  const neighbor = particlesRef.current[nId];
                  if (neighbor.x < scanX) {
                      const dist = Math.hypot(p.x - neighbor.x, p.y - neighbor.y);
                      const alpha = Math.max(0, 1 - dist / 300); // Fade long diagonals if any
                      ctx.strokeStyle = `rgba(0, 255, 255, ${0.4})`;
                      ctx.beginPath();
                      ctx.moveTo(p.x, p.y);
                      ctx.lineTo(neighbor.x, neighbor.y);
                      ctx.stroke();
                  }
              });

              // Draw Node
              ctx.fillStyle = '#00ffff';
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
              
              // Glow effect
              ctx.shadowColor = '#00ffff';
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
          }
        });
      }

      frameIdRef.current = requestAnimationFrame(render);
    };

    frameIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full cursor-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* --- HUD OVERLAYS --- */}
      
      {/* Top Left: System ID */}
      <div className="absolute top-8 left-8 text-xs text-white/50 tracking-widest">
        <div>SYS.ID: GF-992-X</div>
        <div className="mt-1 text-[10px] text-white/30">KERNEL: 4.19.2-TACTICAL</div>
      </div>

      {/* Top Right: Clock & Coords */}
      <div className="absolute top-8 right-8 text-xs text-right text-white/50 tracking-widest font-mono">
        <div>{new Date().toISOString().split('T')[0]}</div>
        <div className="mt-1 text-cyan-500/80">{(timeMs / 1000).toFixed(2)}s</div>
      </div>

      {/* Bottom Left: Status Messages */}
      <div className="absolute bottom-8 left-8 font-mono">
        {phase === AnimationPhase.VOID && (
          <div className="text-white/60 text-xs tracking-wider animate-pulse">
            STATUS: UNSTRUCTURED<br/>
            // COLLECTING STREAMS...
          </div>
        )}
        {phase === AnimationPhase.PING && (
          <div className="text-red-500 text-sm tracking-wider font-bold animate-blink">
            (!) DETECTING HIDDEN DEPENDENCIES...<br/>
            [CRITICAL RISK FOUND]
          </div>
        )}
        {phase === AnimationPhase.CLARITY && (
           <div className="text-cyan-400 text-xs tracking-wider">
            STATUS: OPTIMIZATION COMPLETE.<br/>
            // ARCHITECTURE SECURED.
          </div>
        )}
      </div>

      {/* Bottom Right: Metrics */}
      <div className="absolute bottom-8 right-8 text-right text-[10px] text-white/30 leading-tight">
        <div>MEM: 4096MB</div>
        <div>NET: 10GB/S</div>
        <div>LATENCY: 0.4ms</div>
      </div>

      {/* CENTER REVEAL */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-[2000ms] ${phase === AnimationPhase.CLARITY && timeMs > 14000 ? 'opacity-100' : 'opacity-0'}`}
      >
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
          GUARDFOLIO<span className="text-cyan-400">.AI</span>
        </h1>
        <div className="mt-4 text-sm md:text-xl tracking-[0.5em] text-cyan-200/80 font-light uppercase border-t border-cyan-500/30 pt-4 px-12">
          Clarity Before Consequence
        </div>
      </div>
      
      {/* VIGNETTE & SCANLINES OVERLAY (STATIC) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80 mix-blend-multiply"></div>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>

    </div>
  );
};

export default DarkPoolCanvas;