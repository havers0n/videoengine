import React, { useEffect, useRef, useState } from 'react';
import { AnimationPhase, Point } from '../types';

const TOTAL_DURATION = 18; // seconds
const PHASE_1_DURATION = 6;
const PHASE_2_DURATION = 6;
// Phase 3 is the remaining time

const POINT_COUNT = 120;
const RADAR_RADIUS_PERCENT = 0.35; // % of min screen dimension

const COLORS = {
  green: { r: 16, g: 185, b: 129 },   // emerald-500
  red: { r: 244, g: 63, b: 94 },      // rose-500
  blue: { r: 6, g: 182, b: 212 },     // cyan-500
};

const RadarCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pointsRef = useRef<Point[]>([]);
  
  // React state for UI overlay text updates (decoupled from 60fps canvas loop for performance)
  const [displayText, setDisplayText] = useState<string>("");
  const [subText, setSubText] = useState<string>("");
  const [phaseColor, setPhaseColor] = useState<string>("text-emerald-500");

  const initPoints = (width: number, height: number, radius: number) => {
    const pts: Point[] = [];
    for (let i = 0; i < POINT_COUNT; i++) {
      // Phase 1 & 2: Random distribution (chaotic)
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius; // Uniform distribution in circle
      const p1x = Math.cos(angle) * r;
      const p1y = Math.sin(angle) * r;

      // Phase 3: Structured (Concentric circles or Grid)
      // Let's make a beautiful network structure
      const rings = 4;
      const perRing = Math.floor(POINT_COUNT / rings);
      const ringIndex = i % rings;
      const ringRadius = (radius / rings) * (ringIndex + 1);
      const ringAngle = ((Math.floor(i / rings) * (Math.PI * 2)) / perRing);
      
      const p3x = Math.cos(ringAngle) * ringRadius;
      const p3y = Math.sin(ringAngle) * ringRadius;

      pts.push({
        id: i,
        x: p1x,
        y: p1y,
        phase1X: p1x,
        phase1Y: p1y,
        phase2X: p1x + (Math.random() - 0.5) * 50, // Slight chaos jitter for phase 2
        phase2Y: p1y + (Math.random() - 0.5) * 50,
        targetX: p3x,
        targetY: p3y,
        active: false,
        alpha: 0,
        size: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }
    pointsRef.current = pts;
  };

  const drawRadarGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, radius: number, phase: AnimationPhase, color: {r:number, g:number, b:number}) => {
    const cx = width / 2;
    const cy = height / 2;
    const rgb = `rgba(${color.r}, ${color.g}, ${color.b}`;

    // Rings
    ctx.strokeStyle = `${rgb}, 0.15)`;
    ctx.lineWidth = 1;
    
    // Main outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner rings
    if (phase !== AnimationPhase.CLARITY) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
        ctx.stroke();
    } else {
       // Expand rings for clarity phase
       ctx.strokeStyle = `${rgb}, 0.3)`;
       ctx.beginPath();
       ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
       ctx.stroke();
       ctx.beginPath();
       ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
       ctx.stroke();
       ctx.beginPath();
       ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
       ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = `${rgb}, 0.1)`;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
  };

  const drawBeam = (ctx: CanvasRenderingContext2D, width: number, height: number, radius: number, angle: number, color: {r:number, g:number, b:number}) => {
    const cx = width / 2;
    const cy = height / 2;
    const rgb = `${color.r}, ${color.g}, ${color.b}`;

    // Gradient Beam
    const gradient = ctx.createConicGradient(angle - Math.PI/2, cx, cy);
    gradient.addColorStop(0, `rgba(${rgb}, 0)`);
    gradient.addColorStop(0.1, `rgba(${rgb}, 0)`);
    gradient.addColorStop(0.8, `rgba(${rgb}, 0.05)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0.4)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Leading Edge Line
    ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  };

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;
    
    // Loop animation
    const loopTime = elapsed % TOTAL_DURATION;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * RADAR_RADIUS_PERCENT;

    // --- LOGIC ---
    let phase = AnimationPhase.SEARCH;
    let currentColor = COLORS.green;
    let rotationSpeed = 1.5; // Rad/s

    if (loopTime < PHASE_1_DURATION) {
      phase = AnimationPhase.SEARCH;
      currentColor = COLORS.green;
      rotationSpeed = 1.5;
    } else if (loopTime < PHASE_1_DURATION + PHASE_2_DURATION) {
      phase = AnimationPhase.DETECTION;
      currentColor = COLORS.red;
      rotationSpeed = 3.0;
    } else {
      phase = AnimationPhase.CLARITY;
      currentColor = COLORS.blue;
      rotationSpeed = 0.5;
    }

    // Determine beam angle
    const beamAngle = (loopTime * rotationSpeed) % (Math.PI * 2);

    // React State Updates (Throttled roughly by frame updates, good enough for this demo)
    if (loopTime < PHASE_1_DURATION) {
      if (displayText !== "Рынок кажется спокойным…") {
        setDisplayText("Рынок кажется спокойным…");
        setSubText("");
        setPhaseColor("text-emerald-500 shadow-emerald-500/50");
      }
    } else if (loopTime < PHASE_1_DURATION + PHASE_2_DURATION) {
      // Split Phase 2 (6 seconds) into 5 words: "НО" -> "СКРЫТЫЕ" -> "РИСКИ" -> "ПРОЯВЛЯЮТСЯ" -> "НЕЗАМЕТНО"
      const phase2Time = loopTime - PHASE_1_DURATION;
      const wordStep = PHASE_2_DURATION / 5; // 1.2s per word
      
      let word = "НО";
      if (phase2Time > wordStep * 4) word = "НЕЗАМЕТНО";
      else if (phase2Time > wordStep * 3) word = "ПРОЯВЛЯЮТСЯ";
      else if (phase2Time > wordStep * 2) word = "РИСКИ";
      else if (phase2Time > wordStep * 1) word = "СКРЫТЫЕ";

      if (displayText !== word) {
        setDisplayText(word);
        setSubText("");
        setPhaseColor("text-rose-500 shadow-rose-500/50");
      }
    } else {
      if (displayText !== "GUARDFOLIO AI") {
        setDisplayText("GUARDFOLIO AI");
        setSubText("Полная картина риска.");
        setPhaseColor("text-cyan-400 shadow-cyan-400/50");
      }
    }

    // --- DRAWING ---
    // 1. Fade background slightly for trails? Or clear completely?
    // User requested minimal high tech. Trails might be messy. Let's clear.
    ctx.clearRect(0, 0, width, height);

    // 2. Draw Grid
    drawRadarGrid(ctx, width, height, radius, phase, currentColor);

    // 3. Draw Beam (Only in Phase 1 & 2)
    if (phase !== AnimationPhase.CLARITY) {
        drawBeam(ctx, width, height, radius, beamAngle, currentColor);
    } else {
        // In clarity phase, draw an expanding pulse ring
        const clarityTime = loopTime - (PHASE_1_DURATION + PHASE_2_DURATION);
        const pulseRadius = (clarityTime % 2) / 2 * radius * 1.5;
        const pulseAlpha = 1 - (clarityTime % 2) / 2;
        
        ctx.strokeStyle = `rgba(${COLORS.blue.r}, ${COLORS.blue.g}, ${COLORS.blue.b}, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius + radius * 0.2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 4. Update & Draw Points
    ctx.lineWidth = 1;
    const rgb = `${currentColor.r}, ${currentColor.g}, ${currentColor.b}`;

    pointsRef.current.forEach(p => {
        // Position Logic
        let targetX = 0;
        let targetY = 0;
        
        if (phase === AnimationPhase.SEARCH) {
            targetX = p.phase1X;
            targetY = p.phase1Y;
        } else if (phase === AnimationPhase.DETECTION) {
            // Jittery chaos
            p.phase2X += (Math.random() - 0.5) * 0.5;
            p.phase2Y += (Math.random() - 0.5) * 0.5;
            targetX = p.phase2X;
            targetY = p.phase2Y;
        } else {
            targetX = p.targetX;
            targetY = p.targetY;
        }

        // Lerp position
        // During transition to Clarity, we need smooth lerp. 
        // During Search/Detection, the points appear instantaneously at their spots usually, 
        // but let's just keep position stateful.
        const lerpFactor = phase === AnimationPhase.CLARITY ? 0.05 : 1.0;
        p.x += (targetX - p.x) * lerpFactor;
        p.y += (targetY - p.y) * lerpFactor;

        // Visibility Logic
        if (phase === AnimationPhase.SEARCH) {
            // Check if beam is passing over
            const pAngle = Math.atan2(p.y, p.x); // -PI to PI
            // Normalize angles to 0-2PI
            let normPAngle = pAngle < 0 ? pAngle + Math.PI * 2 : pAngle;
            let normBeam = beamAngle % (Math.PI * 2);
            
            const diff = Math.abs(normBeam - normPAngle);
            // If beam is close or wrapping around 0/360
            if (diff < 0.15 || Math.abs(diff - Math.PI*2) < 0.15) {
                p.alpha = 1.0;
            } else {
                p.alpha *= 0.96; // Fade out
            }
        } else if (phase === AnimationPhase.DETECTION) {
            // Check beam but keep them alive longer/chaotic flickering
            const pAngle = Math.atan2(p.y, p.x);
            let normPAngle = pAngle < 0 ? pAngle + Math.PI * 2 : pAngle;
            let normBeam = beamAngle % (Math.PI * 2);
            const diff = Math.abs(normBeam - normPAngle);

            if (diff < 0.3 || Math.abs(diff - Math.PI*2) < 0.3) {
                p.alpha = 1.0;
            } else {
                p.alpha = Math.max(0.3, p.alpha * 0.98); // Don't fade completely
            }
            
            // Draw connections for chaos
            pointsRef.current.forEach(other => {
                const dist = Math.hypot(p.x - other.x, p.y - other.y);
                if (dist < 40 && p.alpha > 0.5 && other.alpha > 0.5 && Math.random() > 0.9) {
                    ctx.strokeStyle = `rgba(${COLORS.red.r}, ${COLORS.red.g}, ${COLORS.red.b}, 0.15)`;
                    ctx.beginPath();
                    ctx.moveTo(cx + p.x, cy + p.y);
                    ctx.lineTo(cx + other.x, cy + other.y);
                    ctx.stroke();
                }
            });

        } else if (phase === AnimationPhase.CLARITY) {
            // Stay visible
            p.alpha += (1.0 - p.alpha) * 0.05;

             // Draw connections for structure
             pointsRef.current.forEach(other => {
                const dist = Math.hypot(p.x - other.x, p.y - other.y);
                if (dist < 50) {
                    ctx.strokeStyle = `rgba(${COLORS.blue.r}, ${COLORS.blue.g}, ${COLORS.blue.b}, 0.1)`;
                    ctx.beginPath();
                    ctx.moveTo(cx + p.x, cy + p.y);
                    ctx.lineTo(cx + other.x, cy + other.y);
                    ctx.stroke();
                }
            });
        }

        // Draw Point
        if (p.alpha > 0.01) {
            ctx.fillStyle = `rgba(${rgb}, ${p.alpha})`;
            // Add glow
            ctx.shadowBlur = phase === AnimationPhase.CLARITY ? 10 : 0;
            ctx.shadowColor = `rgba(${rgb}, 1)`;
            
            ctx.beginPath();
            ctx.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0; // Reset
        }
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initPoints(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * RADAR_RADIUS_PERCENT);
      };
      
      window.addEventListener('resize', handleResize);
      handleResize(); // Init

      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', () => {});
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 block"
      />

      {/* UI Overlay Layer */}
      <div className="absolute z-30 text-center flex flex-col items-center justify-center pointer-events-none p-4">
        {/* Main Text */}
        <h1 
          className={`text-4xl md:text-7xl font-mono font-bold tracking-widest uppercase transition-all duration-700 ${phaseColor}`}
          style={{ textShadow: '0 0 20px currentColor' }}
        >
          {displayText}
        </h1>
        
        {/* Subtitle (only visible in last phase or transitions if desired) */}
        <p 
            className={`mt-4 text-sm md:text-lg text-cyan-200/80 font-light tracking-[0.2em] transition-opacity duration-1000 ${subText ? 'opacity-100' : 'opacity-0'}`}
        >
            {subText}
        </p>

        {/* Decorative UI elements for "High Tech" feel */}
        <div className="absolute top-[-200px] left-[-200px] w-[400px] h-[400px] border border-white/5 rounded-full animate-pulse opacity-20"></div>
        <div className="absolute bottom-[-150px] right-[-150px] w-[300px] h-[300px] border border-white/5 rounded-full animate-pulse opacity-20 delay-75"></div>
      </div>

      {/* Scanline Overlay handled in index.html styles */}
      <div className="scanlines"></div>
      <div className="vignette"></div>
    </div>
  );
};

export default RadarCanvas;