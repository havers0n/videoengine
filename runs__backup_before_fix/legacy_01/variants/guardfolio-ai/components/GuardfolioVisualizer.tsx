import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Particle, AnimationPhase } from '../types';

// --- Constants ---
const PARTICLE_COUNT = 125; // 5x5x5 grid
const CUBE_SIZE = 5; // Grid dimension (5x5x5)
const GRID_SPACING = 35; // Distance between cubes in the assembled state
const BASE_PARTICLE_SIZE = 14;
const SHAKE_INTENSITY = 8;
const ANIMATION_DURATION = 18; // Seconds

// Colors
const COLOR_WHITE = '#E4E4E7'; // Zinc 200
const COLOR_RED = '#EF4444';   // Red 500
const COLOR_CYAN = '#06B6D4';  // Cyan 500

const GuardfolioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  // UI State
  const [phase, setPhase] = useState<AnimationPhase>(AnimationPhase.DISPERSION);
  const [statusText, setStatusText] = useState("INITIALIZING SYSTEM...");
  const [showFinalTitle, setShowFinalTitle] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    // Initialize particles only once
    if (particlesRef.current.length === 0) {
      const tempParticles: Particle[] = [];
      let id = 0;
      // Create a 5x5x5 grid logic for target positions
      const offset = Math.floor(CUBE_SIZE / 2);

      for (let x = 0; x < CUBE_SIZE; x++) {
        for (let y = 0; y < CUBE_SIZE; y++) {
          for (let z = 0; z < CUBE_SIZE; z++) {
            tempParticles.push({
              id: id++,
              // Start at random positions (Dispersion)
              x: (Math.random() - 0.5) * 800,
              y: (Math.random() - 0.5) * 600,
              z: (Math.random() - 0.5) * 800,
              // Target is grid position (Assembly) centered around 0,0,0
              tx: (x - offset) * GRID_SPACING,
              ty: (y - offset) * GRID_SPACING,
              tz: (z - offset) * GRID_SPACING,
              // Random velocity for floating
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              vz: (Math.random() - 0.5) * 0.5,
              size: BASE_PARTICLE_SIZE,
              baseColor: COLOR_WHITE,
            });
          }
        }
      }
      particlesRef.current = tempParticles;
    }
  }, []);

  // --- Helper: Isometric Cube Drawing ---
  const drawIsoCube = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    colorHex: string
  ) => {
    // Convert hex to rgb for shading
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const shade = (mult: number) => `rgb(${r * mult}, ${g * mult}, ${b * mult})`;

    // Isometric math
    // 30 degrees = 0.523599 radians
    // cos(30) ≈ 0.866
    // sin(30) = 0.5
    
    const dx = size * 0.866;
    const dy = size * 0.5;
    
    // Vertices relative to center (x,y)
    // Center is (0,0)
    // Top: (0, -size)
    // Bottom: (0, size)
    // Right-Top: (dx, -dy)
    // Right-Bottom: (dx, dy)
    // Left-Top: (-dx, -dy)
    // Left-Bottom: (-dx, dy)

    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    
    // 1. Top Face (Lightest)
    ctx.fillStyle = shade(1.2); // Highlight
    ctx.strokeStyle = shade(1.2);
    ctx.beginPath();
    ctx.moveTo(x, y - size); // Top Vertex
    ctx.lineTo(x + dx, y - size * 0.5 - dy); // Top-Right (Actually, isometric top is flattened. Let's adjust.)
    
    // Proper Isometric Cube Construction
    // A standard iso cube drawn from center (cx, cy) with edge length `s`
    
    // Vertices
    const vCenter = { x: x, y: y };
    const vTop = { x: x, y: y - size };
    const vBottom = { x: x, y: y + size };
    
    const vTopLeft = { x: x - dx, y: y - dy - size/2 }; // Doesn't look right for a true cube.
    // Let's use the standard "Hexagon" approach for a perfect cube.
    
    // Distances from center
    const rx = size * 0.866; // x radius
    const ry = size * 0.5;   // y radius of the "diamond" halves
    
    // Top Face
    ctx.beginPath();
    ctx.moveTo(x, y - size); // Topmost point
    ctx.lineTo(x + rx, y - size + ry); // Right-Mid
    ctx.lineTo(x, y - size + 2 * ry); // Center (of the top face visual, which is actually 0,0 relative to cube top?)
    // Let's stick to the simplest visual: 3 Rhombuses meeting at center.
    
    // Center of the hexagon is (x, y)
    // 1. Top Rhombus
    ctx.fillStyle = shade(1.1); // Light
    ctx.beginPath();
    ctx.moveTo(x, y); // Center
    ctx.lineTo(x - rx, y - ry); 
    ctx.lineTo(x, y - 2 * ry); 
    ctx.lineTo(x + rx, y - ry);
    ctx.closePath();
    ctx.fill();

    // 2. Right Rhombus
    ctx.fillStyle = shade(0.8); // Medium
    ctx.beginPath();
    ctx.moveTo(x, y); // Center
    ctx.lineTo(x + rx, y - ry);
    ctx.lineTo(x + rx, y + ry);
    ctx.lineTo(x, y + 2 * ry);
    ctx.closePath();
    ctx.fill();

    // 3. Left Rhombus
    ctx.fillStyle = shade(0.5); // Dark
    ctx.beginPath();
    ctx.moveTo(x, y); // Center
    ctx.lineTo(x, y + 2 * ry);
    ctx.lineTo(x - rx, y + ry);
    ctx.lineTo(x - rx, y - ry);
    ctx.closePath();
    ctx.fill();
    
    // Optional: Edge highlight for tech feel
    ctx.strokeStyle = shade(0.3);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  };

  // --- Animation Loop ---
  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000; // Seconds
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (canvas && ctx && containerRef.current) {
      // Resize canvas to match container
      const { clientWidth, clientHeight } = containerRef.current;
      if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // --- Phase Logic ---
      let currentPhase = AnimationPhase.DISPERSION;
      let shake = 0;
      let globalRotationY = 0;
      
      if (elapsed < 6) {
        // Phase 1: Dispersion
        currentPhase = AnimationPhase.DISPERSION;
        if (phase !== AnimationPhase.DISPERSION) setPhase(AnimationPhase.DISPERSION);
        setStatusText("STATUS: UNSTRUCTURED DATA STREAM...");
        setShowFinalTitle(false);
      } else if (elapsed < 12) {
        // Phase 2: Crash
        currentPhase = AnimationPhase.CRASH;
        if (phase !== AnimationPhase.CRASH) setPhase(AnimationPhase.CRASH);
        setStatusText("⚠️ CRITICAL: CORRELATION DETECTED");
        shake = SHAKE_INTENSITY;
        setShowFinalTitle(false);
      } else {
        // Phase 3: Assembly
        currentPhase = AnimationPhase.ASSEMBLY;
        if (phase !== AnimationPhase.ASSEMBLY) setPhase(AnimationPhase.ASSEMBLY);
        setStatusText("SYSTEM OPTIMIZED: GUARDFOLIO AI ACTIVE");
        setShowFinalTitle(true);
        // Slowly rotate the final assembly
        globalRotationY = (elapsed - 12) * 0.5; 
      }

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Screen Shake
      if (shake > 0) {
        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        ctx.translate(sx, sy);
      }

      // --- Physics & Projection ---
      // We map 3D particles to 2D screen array for sorting
      const renderList: { screenX: number; screenY: number; zIndex: number; size: number; color: string }[] = [];

      particlesRef.current.forEach(p => {
        let targetX = p.tx;
        let targetY = p.ty;
        let targetZ = p.tz;
        let lerpFactor = 0.05;

        // Phase-specific Behavior
        if (currentPhase === AnimationPhase.DISPERSION) {
          // Float loosely
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          // Keep bounds loosely
          if (Math.abs(p.x) > 600) p.vx *= -1;
          if (Math.abs(p.y) > 400) p.vy *= -1;
          if (Math.abs(p.z) > 600) p.vz *= -1;
          
          p.baseColor = COLOR_WHITE;
        } 
        else if (currentPhase === AnimationPhase.CRASH) {
          // Smash into center (0,0,0) violently
          targetX = (Math.random() - 0.5) * 100;
          targetY = (Math.random() - 0.5) * 100;
          targetZ = (Math.random() - 0.5) * 100;
          
          // Move fast
          lerpFactor = 0.1;
          p.x += (targetX - p.x) * lerpFactor;
          p.y += (targetY - p.y) * lerpFactor;
          p.z += (targetZ - p.z) * lerpFactor;
          
          p.baseColor = COLOR_RED;
        } 
        else if (currentPhase === AnimationPhase.ASSEMBLY) {
          // Snap to Grid (tx, ty, tz)
          lerpFactor = 0.08; // Snappy
          
          // Apply rotation to target logic if we want the particles to flow into a rotating grid
          // But simpler is: Move to grid, and rotate the projection.
          p.x += (p.tx - p.x) * lerpFactor;
          p.y += (p.ty - p.y) * lerpFactor;
          p.z += (p.tz - p.z) * lerpFactor;

          p.baseColor = COLOR_CYAN;
        }

        // Apply Global Rotation (for Phase 3)
        let rx = p.x;
        let ry = p.y;
        let rz = p.z;

        if (globalRotationY !== 0) {
          const cos = Math.cos(globalRotationY);
          const sin = Math.sin(globalRotationY);
          // Rotate around Y axis
          const x2 = rx * cos - rz * sin;
          const z2 = rx * sin + rz * cos;
          rx = x2;
          rz = z2;
        }

        // Isometric Projection
        // Standard Iso:
        // x_screen = (x - z) * cos(30)
        // y_screen = y + (x + z) * sin(30)
        
        // Let's use a slightly adjusted perspective for better depth
        // Dimetric/Isometric hybrid
        const isoX = (rx - rz) * 0.866;
        const isoY = ry + (rx + rz) * 0.5;

        // Depth sorting value (larger Y is closer usually in this projection, 
        // or we use Z-buffer logic. In iso, lower on screen is usually 'closer' visually if y is up)
        // Actually, painter's algo: draw furthest back first.
        // In this projection (x-z), furthest back is smallest x+z.
        // Let's use (rx + rz) + ry for depth approx?
        // Simple Painter's: Sort by Y screen position often works for simple ISO if objects are distinct heights.
        // But for a cloud, we need Z-depth.
        // In our rotation: Z is depth.
        // Let's use rotated Z (rz) plus some Y factor.
        
        const depth = rx + rz; // Diagonal depth plane for isometric

        renderList.push({
          screenX: centerX + isoX,
          screenY: centerY + isoY,
          zIndex: depth, // Sort by this
          size: p.size,
          color: p.baseColor
        });
      });

      // Sort: Draw background (lowest Z index) first
      // In this specific iso projection (x-z), x+z corresponds to depth.
      renderList.sort((a, b) => a.zIndex - b.zIndex);

      // Draw
      renderList.forEach(item => {
        drawIsoCube(ctx, item.screenX, item.screenY, item.size, item.color);
      });

      ctx.restore();
      
      // Reset if loop ends
      if (elapsed > ANIMATION_DURATION) {
         startTimeRef.current = time; // Loop
         // Reset positions for smooth loop? Or just snap back?
         // For a seamless demo, maybe we don't loop or we reset particles
         particlesRef.current.forEach(p => {
            p.x = (Math.random() - 0.5) * 800;
            p.y = (Math.random() - 0.5) * 600;
            p.z = (Math.random() - 0.5) * 800;
         });
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- Dynamic Styles ---
  const getStatusColor = () => {
    switch (phase) {
      case AnimationPhase.DISPERSION: return 'text-zinc-400';
      case AnimationPhase.CRASH: return 'text-red-500 animate-pulse font-bold';
      case AnimationPhase.ASSEMBLY: return 'text-cyan-400 font-bold';
      default: return 'text-white';
    }
  };

  const getBorderColor = () => {
    switch (phase) {
        case AnimationPhase.DISPERSION: return 'border-zinc-800';
        case AnimationPhase.CRASH: return 'border-red-900';
        case AnimationPhase.ASSEMBLY: return 'border-cyan-900';
        default: return 'border-zinc-800';
    }
  }

  return (
    <div ref={containerRef} className={`w-full h-full relative border-[20px] transition-colors duration-1000 ${getBorderColor()} bg-zinc-950`}>
      {/* Canvas Layer */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Grid Overlay Effect (Scanlines) */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.8)_100%)]"></div>

      {/* Final Title - Center */}
      {showFinalTitle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-center animate-in fade-in zoom-in duration-1000">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]">
              GUARDFOLIO
            </h1>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="h-px w-12 bg-cyan-500"></div>
              <span className="text-cyan-400 tracking-[0.5em] text-sm md:text-base font-bold">INTELLIGENCE SECURED</span>
              <div className="h-px w-12 bg-cyan-500"></div>
            </div>
          </div>
        </div>
      )}

      {/* HUD: Status Bar - Bottom Center */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-10">
         <div className="flex flex-col items-center gap-2">
            <div className={`text-xs md:text-sm tracking-widest font-mono ${getStatusColor()}`}>
                {statusText}
            </div>
            {/* Decoration Lines */}
            <div className="flex gap-1">
                <div className={`w-16 h-1 ${phase === AnimationPhase.CRASH ? 'bg-red-500' : 'bg-zinc-700'}`}></div>
                <div className={`w-2 h-1 ${phase === AnimationPhase.ASSEMBLY ? 'bg-cyan-500' : 'bg-zinc-800'}`}></div>
                <div className={`w-16 h-1 ${phase === AnimationPhase.CRASH ? 'bg-red-500' : 'bg-zinc-700'}`}></div>
            </div>
         </div>
      </div>
      
      {/* HUD: Top Corners */}
      <div className="absolute top-8 left-8 text-xs text-zinc-600 font-mono tracking-widest">
        SYS.VER.4.0.2
        <br />
        MODULE: VISUALIZER
      </div>
      <div className="absolute top-8 right-8 text-xs text-zinc-600 font-mono tracking-widest text-right">
        FR: 60
        <br />
        LATENCY: 4ms
      </div>

    </div>
  );
};

export default GuardfolioVisualizer;