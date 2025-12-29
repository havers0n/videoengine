import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Phase = 'FOG' | 'DETECTION' | 'MAPPING';

interface Point {
  angle: number;
  baseRadius: number;
  noiseOffset: number;
  smoothOffset: number;
  isThreat: boolean;
}

// --- Constants ---
const CANVAS_SIZE = 800; // Internal resolution
const CYCLE_DURATION = 18000; // 18 seconds total
const FOG_DURATION = 6000;
const DETECTION_DURATION = 6000;
// Mapping is the rest

const COLORS = {
  fog: { primary: 'rgba(150, 150, 150, 0.5)', secondary: 'rgba(50, 50, 50, 0.1)', radar: 'rgba(255, 255, 255, 0.1)' },
  detection: { primary: '#ff3333', secondary: 'rgba(100, 0, 0, 0.3)', radar: 'rgba(255, 0, 0, 0.4)' },
  mapping: { primary: '#00ccff', secondary: 'rgba(0, 100, 200, 0.2)', radar: 'rgba(0, 200, 255, 0.3)' },
};

// --- Helper Math ---
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Generate terrain data once
const generateTerrain = (count: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    // Create jagged noise
    const noise = (Math.sin(angle * 10) * 20) + (Math.cos(angle * 25) * 15) + (Math.random() * 40);
    // Create smooth path for phase 3
    const smooth = (Math.sin(angle * 4) * 10) + 10;
    
    // Determine if this area has a "threat" (peaks in the noise)
    const isThreat = noise > 40 && i % 15 === 0;

    points.push({
      angle,
      baseRadius: 200, // Base circle radius
      noiseOffset: noise,
      smoothOffset: smooth,
      isThreat
    });
  }
  return points;
};

const SonarAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('FOG');
  
  // Audio refs (Conceptual placeholder, not implementing actual audio to keep it pure visual as requested)
  
  const terrainData = useMemo(() => generateTerrain(360), []); // 360 points for high detail

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % CYCLE_DURATION;
      
      // Determine Phase
      let currentPhase: Phase = 'FOG';
      if (elapsed < FOG_DURATION) currentPhase = 'FOG';
      else if (elapsed < FOG_DURATION + DETECTION_DURATION) currentPhase = 'DETECTION';
      else currentPhase = 'MAPPING';
      
      // Sync state for React UI text overlay (use a ref or careful state update to avoid re-renders loop)
      // We'll update React state only when it changes to avoid thrashing
      setPhase((prev) => (prev !== currentPhase ? currentPhase : prev));

      // Clear Canvas
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const cx = CANVAS_SIZE / 2;
      const cy = CANVAS_SIZE / 2;

      // --- Radar Sweep Logic ---
      // 3 rotations per 18s cycle -> 1 rotation per 6s
      const rotationSpeed = (Math.PI * 2) / 6000; 
      const currentAngle = (elapsed * rotationSpeed) % (Math.PI * 2);

      // --- Draw Background Grid (Concentric Circles) ---
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      [100, 200, 300].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // --- Draw Crosshairs ---
      ctx.beginPath();
      ctx.moveTo(cx - 350, cy);
      ctx.lineTo(cx + 350, cy);
      ctx.moveTo(cx, cy - 350);
      ctx.lineTo(cx, cy + 350);
      ctx.stroke();

      // --- Phase Specific Rendering ---

      // 1. Setup Styles based on Phase
      let mainColor = COLORS.fog.primary;
      let radarColor = COLORS.fog.radar;
      
      if (currentPhase === 'DETECTION') {
        mainColor = COLORS.detection.primary;
        radarColor = COLORS.detection.radar;
      } else if (currentPhase === 'MAPPING') {
        mainColor = COLORS.mapping.primary;
        radarColor = COLORS.mapping.radar;
      }

      // 2. Draw Radar Sweep (Conic Gradient)
      const gradient = ctx.createConicGradient(currentAngle - Math.PI/2, cx, cy);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.7, 'transparent');
      gradient.addColorStop(1, radarColor);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 350, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Terrain / Points
      ctx.lineWidth = 2;
      
      // Mapping Phase Grid Effect
      if (currentPhase === 'MAPPING') {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 204, 255, 0.1)';
        const gridSize = 40;
        for (let x = 0; x <= CANVAS_SIZE; x += gridSize) {
            ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_SIZE);
        }
        for (let y = 0; y <= CANVAS_SIZE; y += gridSize) {
            ctx.moveTo(0, y); ctx.lineTo(CANVAS_SIZE, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Determine Zoom/Scale effect for final logo reveal
      let scale = 1;
      if (currentPhase === 'MAPPING') {
          // Slowly zoom out slightly to show structure
          const phaseTime = elapsed - (FOG_DURATION + DETECTION_DURATION);
          scale = 1 - (phaseTime / 6000) * 0.2; 
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      if (currentPhase === 'FOG') {
        // Draw Dots only when scanned
        terrainData.forEach((point) => {
          const angleDiff = (point.angle - (currentAngle - Math.PI/2) + Math.PI * 4) % (Math.PI * 2);
          // Only visible if recently swept (angleDiff near 2PI or 0)
          let opacity = 0;
          if (angleDiff > Math.PI * 1.5) {
             opacity = (angleDiff - Math.PI * 1.5) / (Math.PI * 0.5);
          }
          
          if (opacity > 0.01) {
             const r = point.baseRadius + point.noiseOffset;
             const x = Math.cos(point.angle) * r;
             const y = Math.sin(point.angle) * r;
             
             ctx.fillStyle = `rgba(200, 200, 200, ${opacity * 0.5})`;
             ctx.beginPath();
             ctx.arc(x, y, 2, 0, Math.PI * 2);
             ctx.fill();
          }
        });
      } else if (currentPhase === 'DETECTION') {
         // Draw Jagged Lines
         ctx.beginPath();
         ctx.strokeStyle = mainColor;
         ctx.lineWidth = 2;
         ctx.shadowBlur = 10;
         ctx.shadowColor = mainColor;

         terrainData.forEach((point, i) => {
           const r = point.baseRadius + point.noiseOffset;
           const x = Math.cos(point.angle) * r;
           const y = Math.sin(point.angle) * r;
           if (i === 0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
         });
         ctx.closePath();
         ctx.stroke();
         ctx.shadowBlur = 0;

         // Draw Warning Icons
         terrainData.forEach((point) => {
            if (point.isThreat) {
                const r = point.baseRadius + point.noiseOffset + 20;
                const x = Math.cos(point.angle) * r;
                const y = Math.sin(point.angle) * r;
                
                // Blink effect
                const blink = Math.sin(elapsed * 0.01) > 0;
                if (blink) {
                    ctx.font = '24px Arial';
                    ctx.fillStyle = '#ff0000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('!', x, y);
                }
            }
         });

      } else if (currentPhase === 'MAPPING') {
         // Morph to Smooth
         ctx.beginPath();
         ctx.strokeStyle = mainColor;
         ctx.lineWidth = 4;
         ctx.shadowBlur = 15;
         ctx.shadowColor = mainColor;
         
         // Animate morphing from noise to smooth
         const phaseTime = elapsed - (FOG_DURATION + DETECTION_DURATION);
         const morphFactor = Math.min(phaseTime / 1000, 1); // 1 second to morph

         terrainData.forEach((point, i) => {
           const noiseR = point.baseRadius + point.noiseOffset;
           const smoothR = point.baseRadius + point.smoothOffset;
           const r = noiseR + (smoothR - noiseR) * morphFactor; // Lerp

           const x = Math.cos(point.angle) * r;
           const y = Math.sin(point.angle) * r;
           if (i === 0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
         });
         ctx.closePath();
         ctx.stroke();
         
         // Inner Fill
         ctx.fillStyle = 'rgba(0, 204, 255, 0.1)';
         ctx.fill();
         
         // Draw "Safe Path" (A dashed line cutting through)
         if (morphFactor >= 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.moveTo(-100, 50);
            ctx.bezierCurveTo(-50, -50, 50, -50, 100, 50);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw Center Guardfolio Emblem (Abstract shield)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
         }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [terrainData]); // Dependency array ensures logic updates if generation changes

  return (
    <div ref={containerRef} className="relative w-full max-w-[800px] aspect-square flex items-center justify-center">
      {/* The Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-full h-full object-contain z-10"
      />

      {/* Text Overlay Logic */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        <AnimatePresence mode="wait">
          {phase === 'FOG' && (
            <motion.div
              key="fog-text"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(5px)', transition: { duration: 0.5 } }}
              transition={{ duration: 1 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-6xl font-bold text-gray-300 tracking-wider">Слепая зона...</h1>
              <p className="mt-2 text-gray-500 text-sm tracking-widest uppercase">System Scanning</p>
            </motion.div>
          )}

          {phase === 'DETECTION' && (
            <motion.div
              key="detection-text"
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl font-bold text-red-500 tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
                Скрывает<br/>реальные угрозы
              </h1>
              <div className="mt-4 flex justify-center gap-4">
                 {[1,2,3].map(i => (
                     <motion.div 
                        key={i} 
                        animate={{ opacity: [0, 1, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        className="w-2 h-2 bg-red-500 rounded-full"
                     />
                 ))}
              </div>
            </motion.div>
          )}

          {phase === 'MAPPING' && (
            <motion.div
              key="mapping-text"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-center bg-black/60 backdrop-blur-sm p-8 rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,204,255,0.2)]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-4 border-2 border-cyan-400 rounded-full flex items-center justify-center"
              >
                  <div className="w-10 h-10 bg-cyan-400 rounded-full animate-pulse" />
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">Guardfolio</h1>
              <p className="text-cyan-400 text-xl md:text-2xl tracking-widest font-light">Полная карта рисков</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar (Bottom) */}
      <div className="absolute bottom-10 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
            className="h-full bg-white"
            animate={{ width: "100%" }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
        />
      </div>
    </div>
  );
};

export default SonarAnimation;