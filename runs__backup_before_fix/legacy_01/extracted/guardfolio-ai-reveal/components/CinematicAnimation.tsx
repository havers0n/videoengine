import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Play } from 'lucide-react';

// --- Types & Constants ---
interface Point3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  gridX: number;
  gridY: number;
  gridZ: number;
  phase1Offset: number; // Random offset for drift
  size: number;
}

const TOTAL_DURATION = 18; // seconds
const PHASE_1_DURATION = 6;
const PHASE_2_DURATION = 6;
// Phase 3 is the remainder

const PARTICLE_COUNT = 80;
const FOV = 600;

// --- Helper Functions ---
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const project = (p: Point3D, width: number, height: number) => {
  const scale = FOV / (FOV + p.z);
  const x2d = (p.x * scale) + width / 2;
  const y2d = (p.y * scale) + height / 2;
  return { x: x2d, y: y2d, scale };
};

// Ease functions
const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
const easeInOutQuad = (x: number): number => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

const CinematicAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [subText, setSubText] = useState("");
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Initialize particles once
  const particlesRef = useRef<Point3D[]>([]);

  const initParticles = () => {
    const parts: Point3D[] = [];
    const cols = 10;
    const rows = 8;
    const spacing = 120;
    
    // Grid Setup for Phase 3
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random starting position (Chaos)
      const baseX = randomRange(-800, 800);
      const baseY = randomRange(-600, 600);
      const baseZ = randomRange(0, 1000);

      // Target Grid Position (Order)
      const col = i % cols;
      const row = Math.floor(i / cols);
      const gridX = (col - cols / 2) * spacing + (spacing / 2);
      const gridY = (row - rows / 2) * spacing + (spacing / 2);
      const gridZ = 0; // Flat plane

      parts.push({
        x: baseX,
        y: baseY,
        z: baseZ,
        baseX,
        baseY,
        baseZ,
        gridX,
        gridY,
        gridZ,
        phase1Offset: Math.random() * 1000,
        size: randomRange(10, 25),
      });
    }
    particlesRef.current = parts;
  };

  useEffect(() => {
    initParticles();
    // Start automatically
    handleStart();
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    startTimeRef.current = null;
    setIsPlaying(true);
    setFinished(false);
    requestRef.current = requestAnimationFrame(animate);
  };

  const animate = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000; // in seconds

    if (elapsed > TOTAL_DURATION) {
      setFinished(true);
      setIsPlaying(false);
      // Final draw to ensure end state is visible
      draw(TOTAL_DURATION);
      return;
    }

    draw(elapsed);
    
    // Update Text State for React UI
    if (elapsed < 6) {
      setPhaseIndex(0);
      setCurrentText("Картина размыта…");
      setSubText("");
    } else if (elapsed < 12) {
      setPhaseIndex(1);
      setCurrentText("Опасности ближе, чем кажется.");
      setSubText("");
    } else {
      setPhaseIndex(2);
      setCurrentText("GUARDFOLIO AI");
      setSubText("Полная ясность.");
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const draw = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#050505'; // Almost black
    ctx.fillRect(0, 0, width, height);

    // Sort particles by Z for depth
    particlesRef.current.sort((a, b) => b.z - a.z);

    // --- PHASE LOGIC ---
    // Phase 1: 0 -> 6s (Fog)
    // Phase 2: 6 -> 12s (Reveal/Risk)
    // Phase 3: 12 -> 18s (Control/Grid)

    let scanX = -1000; // For phase 3 scanning effect

    particlesRef.current.forEach((p) => {
      let currentX = p.baseX;
      let currentY = p.baseY;
      let currentZ = p.baseZ;
      let color = '';
      let alpha = 1;
      let blurAmount = 0;
      let shapeType: 'circle' | 'triangle' | 'rect' = 'circle';
      let strokeOnly = false;

      // --- PHASE 1: FOG (0-6s) ---
      if (t < 6) {
        // Drift movement
        const driftSpeed = 0.2;
        currentX += Math.sin(t * driftSpeed + p.phase1Offset) * 50;
        currentY += Math.cos(t * driftSpeed + p.phase1Offset) * 50;
        
        // High Z depth blur simulation
        // The further away, the more "spread" and transparent
        alpha = Math.max(0.1, 1 - (p.z / 1200)); 
        blurAmount = 20;
        color = `rgba(200, 200, 220, ${alpha * 0.3})`; // Ghostly white
        shapeType = 'circle';
      }
      
      // --- TRANSITION TO PHASE 2 (6s approx) ---
      else if (t >= 6 && t < 12) {
        const p2Time = t - 6; // 0 to 6
        // Quick snap focus transition in first 0.5s
        const focusProgress = Math.min(p2Time * 2, 1); 
        
        // Movement: Nervous jitter
        const jitter = (1 - focusProgress) * 20 + 2; // Settles down but stays energetic
        currentX += (Math.random() - 0.5) * jitter;
        currentY += (Math.random() - 0.5) * jitter;

        // Color transition: Fog Grey -> Danger Red
        // We use solid sharp colors now
        const r = 255;
        const g = Math.floor(50 * (1 - focusProgress) + 200 * (1-focusProgress)); // fade out green/blue
        const b = Math.floor(50 * (1 - focusProgress) + 220 * (1-focusProgress));
        
        color = `rgba(${r}, ${g}, ${b}, 0.8)`;
        shapeType = 'triangle';
        strokeOnly = true;
      }

      // --- TRANSITION TO PHASE 3 (12s approx) ---
      else {
        const p3Time = t - 12; // 0 to 6
        
        // Scanline effect moving across screen
        const scanProgress = easeInOutQuad(Math.min(p3Time / 3, 1)); // 3 seconds to scan full width
        const scanXPos = (scanProgress * width * 1.5) - (width * 0.25); // Start off screen left, end off screen right
        scanX = scanXPos;

        // Calculate projection to see if we are "scanned"
        const proj = project({ x: currentX, y: currentY, z: currentZ, baseX:0, baseY:0, baseZ:0, gridX:0, gridY:0, gridZ:0, phase1Offset:0, size:0 }, width, height);
        const isScanned = proj.x < scanXPos;

        if (isScanned) {
          // CONTROLLED STATE (Blue, Grid)
          // Lerp towards grid
          const settleFactor = 0.1; // Instant-ish but smooth
          currentX = p.gridX; // Snap logic or lerp logic? Let's lerp based on time since scanned?
          // Actually, let's just make them move towards grid smoothly globally, but color changes on scan
          
          // Global movement to grid starts at 12s
          const gridProgress = easeOutCubic(Math.min(p3Time / 4, 1));
          currentX = p.baseX + (p.gridX - p.baseX) * gridProgress;
          currentY = p.baseY + (p.gridY - p.baseY) * gridProgress;
          currentZ = p.baseZ + (p.gridZ - p.baseZ) * gridProgress;

          color = `rgba(0, 255, 255, 0.9)`; // Cyan
          shapeType = 'rect';
          strokeOnly = false; // Solid ordered blocks
        } else {
          // STILL IN CHAOS (Red, Jitter) until scanned
          // Keep floating a bit
           // Global movement to grid starts at 12s even if not scanned, but look chaotic?
           // No, let's keep them chaotic until the line hits them
           const jitter = 2;
           currentX += (Math.random() - 0.5) * jitter;
           currentY += (Math.random() - 0.5) * jitter;
           
           color = `rgba(255, 50, 50, 0.6)`;
           shapeType = 'triangle';
           strokeOnly = true;
        }
      }

      // Project 3D to 2D
      const { x, y, scale } = project({ 
        x: currentX, 
        y: currentY, 
        z: currentZ, 
        baseX:0, baseY:0, baseZ:0, gridX:0, gridY:0, gridZ:0, phase1Offset:0, size:0 
      }, width, height);

      const scaledSize = p.size * scale;

      // Draw Shape
      ctx.beginPath();
      
      if (shapeType === 'circle') {
        // Soft Foggy Circle
        // Fake blur using radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, scaledSize * 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'screen'; // Additive blending for fog
        ctx.arc(x, y, scaledSize * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; // Reset
      } 
      else if (shapeType === 'triangle') {
        // Sharp Red Triangle
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fillStyle = color.replace('0.8', '0.2'); // Lower alpha fill
        
        ctx.moveTo(x, y - scaledSize);
        ctx.lineTo(x + scaledSize, y + scaledSize);
        ctx.lineTo(x - scaledSize, y + scaledSize);
        ctx.closePath();
        
        if (strokeOnly) {
          ctx.stroke();
          ctx.fill(); // faint fill
        } else {
          ctx.fill();
        }
      }
      else if (shapeType === 'rect') {
        // Sharp Cyan Rect/Tech
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;

        const s = scaledSize * 0.8;
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
        ctx.strokeRect(x - s, y - s, s * 2, s * 2);
        
        // Connect lines to neighbors? (Optional visual flair)
      }
    });

    // Draw Scanline (Phase 3)
    if (t >= 12 && scanX > -500 && scanX < width + 500) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();

      // Scanline Glow
      const grad = ctx.createLinearGradient(scanX - 50, 0, scanX, 0);
      grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
      grad.addColorStop(1, 'rgba(0, 255, 255, 0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 50, 0, 50, height);
    }

    // Vignette
    const rad = Math.max(width, height) / 1.5;
    const vignette = ctx.createRadialGradient(width/2, height/2, rad * 0.6, width/2, height/2, rad);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0,width,height);
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <div className={`transition-all duration-1000 ease-in-out transform flex flex-col items-center
          ${phaseIndex === 0 ? 'opacity-70 blur-sm scale-95' : 
            phaseIndex === 1 ? 'opacity-100 scale-110 text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 
            'opacity-100 scale-100 text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]'}
        `}>
          <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-center px-4">
            {currentText}
          </h1>
          {subText && (
            <p className="mt-4 text-xl md:text-2xl font-light tracking-[0.5em] text-cyan-100 animate-pulse">
              {subText}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar (Optional, for debugging or visual feedback) */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-all duration-100"
           style={{ width: '100%', transform: `scaleX(${Math.min((startTimeRef.current ? (Date.now() - startTimeRef.current)/1000 : 0) / TOTAL_DURATION, 1)})`, transformOrigin: 'left' }} 
      />

      {/* Replay Button (Only shows when finished) */}
      {finished && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button 
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-900/30 border border-cyan-500/50 rounded-full text-cyan-400 hover:bg-cyan-500/20 transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
          >
            <RefreshCw size={20} />
            <span className="font-semibold tracking-wider">REPLAY</span>
          </button>
        </div>
      )}

      {!isPlaying && !finished && (
         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto">
         <button 
           onClick={handleStart}
           className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-full text-white hover:bg-white/20 transition-all backdrop-blur-md"
         >
           <Play size={20} />
           <span className="font-semibold tracking-wider">START ANIMATION</span>
         </button>
       </div>
      )}
    </div>
  );
};

export default CinematicAnimation;