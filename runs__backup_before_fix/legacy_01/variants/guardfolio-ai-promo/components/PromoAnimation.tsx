import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Particle, AnimPhase, Point3D } from '../types';

// --- Constants ---
const PARTICLE_COUNT = 150;
const DURATION_PHASE_1 = 6000;
const DURATION_PHASE_2 = 6000;
const DURATION_TOTAL = 18000;

// Colors
const COLOR_PHASE_1 = { r: 226, g: 232, b: 240 }; // Slate-200 #E2E8F0
const COLOR_PHASE_2 = { r: 239, g: 68, b: 68 };   // Red-500 #EF4444
const COLOR_PHASE_3 = { r: 6, g: 182, b: 212 };   // Cyan-500 #06B6D4

// --- Math Helpers ---

// Isometric Projection: Returns 2D screen coordinates from 3D world coordinates
// Using a standard isometric tile formula where Z is UP
const iso = (x: number, y: number, z: number, centerX: number, centerY: number): { x: number, y: number } => {
  // ISO Projection
  // X axis runs diagonal down-right
  // Y axis runs diagonal down-left
  // Z axis runs straight up (negative screen Y)
  
  const tileWidth = 2; // Scaling factor
  const tileHeight = 1; // Scaling factor (1/2 width is standard iso)
  
  // Refined for visual balance in this specific scene
  const scale = 1.0; 
  
  const screenX = (x - y) * tileWidth * scale + centerX;
  const screenY = (x + y) * tileHeight * scale - z * 1.5 + centerY;
  
  return { x: screenX, y: screenY };
};

// Linear Interpolation
const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

// Color Interpolation (RGB)
const lerpColor = (c1: {r:number,g:number,b:number}, c2: {r:number,g:number,b:number}, t: number) => {
  return `rgb(${Math.round(lerp(c1.r, c2.r, t))}, ${Math.round(lerp(c1.g, c2.g, t))}, ${Math.round(lerp(c1.b, c2.b, t))})`;
};

// Hex to RGB helper for drawing
const hexToRgb = (hex: string) => {
  // Simplified for known colors
  if (hex === '#E2E8F0') return COLOR_PHASE_1;
  if (hex === '#EF4444') return COLOR_PHASE_2;
  if (hex === '#06B6D4') return COLOR_PHASE_3;
  return COLOR_PHASE_1;
};

// --- Component ---

const PromoAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation State
  const [phase, setPhase] = useState<AnimPhase>(AnimPhase.DISPERSION);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);

  // Initialize Particles
  useEffect(() => {
    const particles: Particle[] = [];
    
    // Create Grid layout for Phase 3 (5x5x6 = 150)
    const gridSize = 36; // Spacing
    let idx = 0;
    const offset = (2 * gridSize); // Center the 5x5 grid

    for (let z = 0; z < 6; z++) {
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          particles.push({
            id: idx,
            // Start random
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 600,
            z: (Math.random() - 0.5) * 600,
            tx: 0, ty: 0, tz: 0,
            size: 10 + Math.random() * 4,
            baseColor: '#E2E8F0',
            driftOffset: {
              x: (Math.random() - 0.5) * 300,
              y: (Math.random() - 0.5) * 300,
              z: (Math.random() - 0.5) * 300
            },
            driftSpeed: 0.001 + Math.random() * 0.002,
            driftPhase: Math.random() * Math.PI * 2,
            gridPos: {
              x: (x * gridSize) - offset,
              y: (y * gridSize) - offset,
              z: (z * gridSize) - (2.5 * gridSize)
            }
          });
          idx++;
        }
      }
    }
    particlesRef.current = particles;
  }, []);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize
    if (!ctx) return;

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      // -- State Machine --
      let currentPhase = AnimPhase.DISPERSION;
      if (elapsed > DURATION_PHASE_1) currentPhase = AnimPhase.CRITICAL;
      if (elapsed > DURATION_PHASE_1 + DURATION_PHASE_2) currentPhase = AnimPhase.ASSEMBLY;
      
      // Update React state efficiently (only when changed)
      if (currentPhase !== phase) {
        // We use a ref to track if we need to trigger the state update to avoid loops, 
        // but here we just rely on the fact setPhase won't re-render if value is same.
        setPhase(prev => (prev !== currentPhase ? currentPhase : prev));
      }

      // Loop restart logic for development testing (Optional: Remove for production if 1-shot)
      // For this promo, we let it run to finish then hold.
      
      // -- Canvas Setup --
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, width, height);

      // -- Physics Update --
      const particles = particlesRef.current;
      const shakeIntensity = currentPhase === AnimPhase.CRITICAL ? Math.max(0, (elapsed - 6000) / 1000) * 2 : 0;
      
      // Rotation for Phase 3
      let globalRotation = 0;
      if (currentPhase === AnimPhase.ASSEMBLY) {
        globalRotation = (elapsed - 12000) * 0.0005; // Slow rotation
      }

      particles.forEach(p => {
        // Calculate Target based on Phase
        if (currentPhase === AnimPhase.DISPERSION) {
          // Drifting
          p.tx = p.driftOffset.x + Math.sin(timestamp * p.driftSpeed + p.driftPhase) * 50;
          p.ty = p.driftOffset.y + Math.cos(timestamp * p.driftSpeed + p.driftPhase) * 50;
          p.tz = p.driftOffset.z + Math.sin(timestamp * p.driftSpeed * 0.5) * 50;
          p.baseColor = '#E2E8F0';
        } 
        else if (currentPhase === AnimPhase.CRITICAL) {
          // Collapse to center with gravity + noise
          p.tx = 0;
          p.ty = 0;
          p.tz = 0;
          
          // Violent shake
          const shake = 20 + Math.sin(timestamp * 0.05) * 10;
          p.tx += (Math.random() - 0.5) * shake;
          p.ty += (Math.random() - 0.5) * shake;
          p.tz += (Math.random() - 0.5) * shake;

          // Color flash
          if (Math.random() > 0.9) {
             p.baseColor = '#FFFFFF';
          } else {
             p.baseColor = '#EF4444';
          }
        } 
        else if (currentPhase === AnimPhase.ASSEMBLY) {
          // Snap to Grid
          p.tx = p.gridPos.x;
          p.ty = p.gridPos.y;
          p.tz = p.gridPos.z;
          p.baseColor = '#06B6D4';
        }

        // Lerp actual position
        const lerpFactor = currentPhase === AnimPhase.CRITICAL ? 0.05 : 0.08;
        p.x = lerp(p.x, p.tx, lerpFactor);
        p.y = lerp(p.y, p.ty, lerpFactor);
        p.z = lerp(p.z, p.tz, lerpFactor);
      });

      // -- Sorting (Painter's Algorithm) --
      // For isometric: depth = x + y. Smaller (x+y) is further back (top of screen).
      // However, we must rotate coordinates first if we have global rotation.
      
      const renderList = particles.map(p => {
        // Apply Global Y-Rotation (Phase 3)
        let rx = p.x;
        let ry = p.y;
        
        if (globalRotation !== 0) {
          const cos = Math.cos(globalRotation);
          const sin = Math.sin(globalRotation);
          rx = p.x * cos - p.y * sin;
          ry = p.x * sin + p.y * cos;
        }

        // Sort Key: in our Iso formula, Screen Y increases with (x+y).
        // Larger Screen Y means closer to bottom.
        // We want to draw Back -> Front (Top -> Bottom).
        // So we sort by Screen Y ascending?
        // Actually, z affects occlusion too.
        // A robust sort metric for this specific projection:
        // Metric = (rx + ry) * factor - z. 
        // We use the iso Y calculation itself as a proxy for depth sorting in simple scenes.
        const sortDepth = (rx + ry) - p.z; 

        return { p, rx, ry, sortDepth };
      });

      renderList.sort((a, b) => a.sortDepth - b.sortDepth);

      // -- Drawing --
      renderList.forEach(item => {
        const { p, rx, ry } = item;
        const s = p.size; // half-size effectively

        // Calculate 7 vertices for the cube
        // Top Face: (rx-s, ry-s, z+s), (rx+s, ry-s, z+s), (rx+s, ry+s, z+s), (rx-s, ry+s, z+s)
        // Bottom Face needed for walls: (rx+s, ry+s, z-s)... etc

        // Helper to get projected point
        const getP = (dx: number, dy: number, dz: number) => iso(rx + dx, ry + dy, p.z + dz, centerX, centerY);

        const tBack = getP(-s, -s, s);
        const tRight = getP(s, -s, s);
        const tFront = getP(s, s, s);
        const tLeft = getP(-s, s, s);

        const bRight = getP(s, -s, -s);
        const bFront = getP(s, s, -s);
        const bLeft = getP(-s, s, -s);

        // --- Colors ---
        let baseRgb = hexToRgb(p.baseColor);
        // During transition to cyan, we lerp manually if needed, but p.baseColor handles it mostly.
        
        // Face Colors
        // Top: Brightest
        // Left: Medium
        // Right: Darkest (Shadow)
        
        // Dynamic Lighting simulation based on phase
        const isRed = p.baseColor === '#EF4444';
        
        const cTop = `rgba(${baseRgb.r + 30}, ${baseRgb.g + 30}, ${baseRgb.b + 30}, 1)`;
        const cLeft = `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 0.9)`;
        const cRight = `rgba(${baseRgb.r - 40}, ${baseRgb.g - 40}, ${baseRgb.b - 40}, 0.8)`;

        ctx.lineWidth = 0.5;
        ctx.strokeStyle = isRed ? 'rgba(255,100,100,0.3)' : 'rgba(255,255,255,0.1)';

        // Draw Top Face
        ctx.fillStyle = cTop;
        ctx.beginPath();
        ctx.moveTo(tBack.x, tBack.y);
        ctx.lineTo(tRight.x, tRight.y);
        ctx.lineTo(tFront.x, tFront.y);
        ctx.lineTo(tLeft.x, tLeft.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Right Face
        ctx.fillStyle = cRight;
        ctx.beginPath();
        ctx.moveTo(tRight.x, tRight.y);
        ctx.lineTo(tFront.x, tFront.y);
        ctx.lineTo(bFront.x, bFront.y);
        ctx.lineTo(bRight.x, bRight.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Left Face
        ctx.fillStyle = cLeft;
        ctx.beginPath();
        ctx.moveTo(tLeft.x, tLeft.y);
        ctx.lineTo(tFront.x, tFront.y);
        ctx.lineTo(bFront.x, bFront.y);
        ctx.lineTo(bLeft.x, bLeft.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      frameIdRef.current = requestAnimationFrame(render);
    };

    // Resize Handler
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start
    frameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, [phase]); // Dependency on phase isn't strictly needed for loop, but clean for react logic

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,#000000_100%)] opacity-80" />

      {/* UI Overlay Logic */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-20 z-10">
        <AnimatePresence mode='wait'>
          {phase === AnimPhase.DISPERSION && (
            <motion.div 
              key="phase1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="font-mono text-xs text-slate-400 tracking-[0.2em] mb-2">
                SYSTEM_ID: 0X92-A
              </div>
              <div className="font-mono text-sm text-slate-200 bg-slate-900/50 px-4 py-2 rounded border border-slate-700 backdrop-blur-sm">
                STATUS: UNSTRUCTURED DATA // COLLECTING STREAMS...
              </div>
            </motion.div>
          )}

          {phase === AnimPhase.CRITICAL && (
            <motion.div 
              key="phase2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <div className="font-mono text-xs text-red-500 tracking-widest font-bold">
                  ANOMALY DETECTED
                </div>
              </div>
              <div className="font-mono text-lg text-red-500 font-bold tracking-tight bg-red-950/30 px-6 py-3 rounded border border-red-500/50 backdrop-blur-md animate-pulse">
                ⚠️ CRITICAL: HIDDEN CORRELATIONS DETECTED
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Final Center Screen Overlay */}
      <AnimatePresence>
        {phase >= AnimPhase.ASSEMBLY && (
          <motion.div 
            key="phase3"
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
          >
            <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-500 tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              GUARDFOLIO AI
            </h1>
            <div className="flex items-center gap-4">
              <div className="h-[1px] w-12 bg-cyan-500/50" />
              <p className="font-mono text-cyan-400 tracking-[0.3em] text-sm md:text-base uppercase">
                Optimized. Risk Adjusted.
              </p>
              <div className="h-[1px] w-12 bg-cyan-500/50" />
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="absolute bottom-12 font-mono text-[10px] text-cyan-900/50"
            >
              PROCESSED 150 DATA NODES
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromoAnimation;