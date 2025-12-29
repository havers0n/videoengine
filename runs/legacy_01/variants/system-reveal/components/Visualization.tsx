import React, { useRef, useEffect, useState } from 'react';
import { lerp, smoothstep, randomRange } from '../utils/math';

interface Point {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  noiseOffset: number;
  id: number;
}

interface SystemState {
  energy: number;     // 0-1: Motion intensity
  noise: number;      // 0-1: Randomness/Entropy
  structure: number;  // 0-1: Order/Coherence
  clarity: number;    // 0-1: Visual Opacity/Thickness
  confidence: number; // 0-1: Stability
  phase: string;
  text: string;
  subtext: string;
  progress: number;   // 0-100
}

const DURATION = 18; // seconds

const Visualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  // State for UI overlay
  const [systemState, setSystemState] = useState<SystemState>({
    energy: 0,
    noise: 0,
    structure: 0,
    clarity: 0,
    confidence: 0,
    phase: 'INIT',
    text: '',
    subtext: '',
    progress: 0,
  });

  // Points reference to persist across renders without causing re-renders
  const pointsRef = useRef<Point[]>([]);

  // Initialize points forming a hexagon grid
  useEffect(() => {
    const points: Point[] = [];
    const layers = 6;
    const spacing = 40;
    let id = 0;

    // Generate hexagon lattice target points
    for (let q = -layers; q <= layers; q++) {
      for (let r = -layers; r <= layers; r++) {
        if (Math.abs(q + r) <= layers) {
            // Hex to pixel conversion
            const x = spacing * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
            const y = spacing * (3.0 / 2 * r);
            
            // Random start positions far away
            const angle = Math.random() * Math.PI * 2;
            const dist = randomRange(200, 800);

            points.push({
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              targetX: x,
              targetY: y,
              vx: 0,
              vy: 0,
              noiseOffset: Math.random() * 100,
              id: id++,
            });
        }
      }
    }
    pointsRef.current = points;
  }, []);

  const calculateSystemState = (t: number): SystemState => {
    const loopTime = t % DURATION;
    
    let energy = 0, noise = 0, structure = 0, clarity = 0, confidence = 0;
    let phase = '', text = '', subtext = '';

    if (loopTime < 6) {
      // 0s -> 6s: LOW AWARENESS
      const p = loopTime / 6;
      phase = 'CALIBRATION';
      text = 'AWAITING INPUT';
      subtext = `SEARCHING FREQUENCIES... ${Math.floor(p * 33)}%`;
      
      energy = lerp(0.1, 0.4, p);
      noise = lerp(0.2, 0.3, p);
      structure = lerp(0.0, 0.1, p); // Very low structure
      clarity = lerp(0.1, 0.4, p);
      confidence = lerp(0.0, 0.2, p);

    } else if (loopTime < 12) {
      // 6s -> 12s: EMERGENCE / TENSION
      const p = (loopTime - 6) / 6;
      phase = 'ANALYSIS';
      text = 'DETECTING PATTERNS';
      subtext = 'CORRELATING DATA STREAMS';
      
      // Energy peaks in the middle of this phase
      energy = lerp(0.4, 0.9, smoothstep(0, 0.5, p)); 
      // Noise rises to create tension, then starts falling
      noise = lerp(0.3, 0.8, Math.sin(p * Math.PI)); 
      structure = lerp(0.1, 0.6, p);
      clarity = lerp(0.4, 0.7, p);
      confidence = lerp(0.2, 0.6, p);

    } else {
      // 12s -> 18s: STABILIZATION / INSIGHT
      const p = (loopTime - 12) / 6;
      phase = 'SYNCHRONIZATION';
      text = 'SYSTEM OPTIMIZED';
      subtext = 'TRUTH REVEALED';
      
      energy = lerp(0.9, 0.2, p); // Energy drops as system stabilizes
      noise = lerp(0.4, 0.0, p);  // Noise disappears
      structure = lerp(0.6, 1.0, smoothstep(0, 0.8, p)); // Perfect structure
      clarity = lerp(0.7, 1.0, p);
      confidence = lerp(0.6, 1.0, p);
    }

    return {
      energy,
      noise,
      structure,
      clarity,
      confidence,
      phase,
      text,
      subtext,
      progress: (loopTime / DURATION) * 100
    };
  };

  const draw = (context: CanvasRenderingContext2D, time: number) => {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const state = calculateSystemState(time);
    
    // Sync React state for UI occasionally (every 100ms or so would be better, but doing it every frame is fine for simple text)
    // To avoid React render loop issues, we'll throttle this in a real app, 
    // but here we can just update a ref or use the hook judiciously. 
    // For this demo, we'll assume the overhead is acceptable or optimize by checking string equality.
    setSystemState(prev => {
        if (prev.text !== state.text || Math.abs(prev.progress - state.progress) > 1) {
            return state;
        }
        return prev;
    });

    // 1. Fade effect (Trails)
    // Lower alpha = longer trails
    const fadeAlpha = lerp(0.3, 0.1, state.energy); 
    context.fillStyle = `rgba(5, 5, 16, ${fadeAlpha})`;
    context.fillRect(0, 0, width, height);

    // 2. Setup styles
    context.globalCompositeOperation = 'lighter'; // Additive blending for glow
    
    // 3. Radar Sweep Logic
    const sweepSpeed = 1.5 + state.energy * 2; // Radians per second
    const sweepAngle = (time * sweepSpeed) % (Math.PI * 2);
    
    // Draw Radar Sweep Line
    const sweepRadius = Math.max(width, height) * 0.8;
    const sweepX = centerX + Math.cos(sweepAngle) * sweepRadius;
    const sweepY = centerY + Math.sin(sweepAngle) * sweepRadius;

    const sweepGradient = context.createLinearGradient(centerX, centerY, sweepX, sweepY);
    // Color evolves from weak blue to intense cyan to pure white
    const r = Math.floor(lerp(50, 0, state.confidence));
    const g = Math.floor(lerp(50, 255, state.confidence));
    const b = Math.floor(lerp(100, 255, state.confidence));
    
    sweepGradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
    sweepGradient.addColorStop(0.5, `rgba(${r},${g},${b},${0.1 + state.energy * 0.2})`);
    sweepGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    // Draw the main sweep sector
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, sweepRadius, sweepAngle - 0.2, sweepAngle, false);
    context.fillStyle = sweepGradient;
    context.fill();

    // Draw distinct scan line
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(sweepX, sweepY);
    context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${state.clarity})`;
    context.lineWidth = 2;
    context.stroke();

    // 4. Points Logic
    pointsRef.current.forEach(point => {
      // Physics Update
      // Brownian/Noise Motion
      const timeScale = time * (1 + state.energy * 5);
      const noiseX = Math.sin(point.noiseOffset + timeScale) * state.noise * 50;
      const noiseY = Math.cos(point.noiseOffset + timeScale) * state.noise * 50;

      // Structure Attraction
      // Interpolate between current random-ish position and grid target
      // If structure is 0, we are just floating. If 1, we are locked.
      
      // Current floating center (dispersed when low structure)
      const floatDist = lerp(400, 0, state.structure);
      const floatAngle = point.noiseOffset; 
      
      // Calculate "Ideal" position based on structure
      // Low structure: Random orbit
      // High structure: Grid target
      const currentTargetX = lerp(
        Math.cos(floatAngle) * floatDist, 
        point.targetX, 
        state.structure
      );
      
      const currentTargetY = lerp(
        Math.sin(floatAngle) * floatDist, 
        point.targetY, 
        state.structure
      );

      // Apply forces
      // Spring force towards target
      const dx = currentTargetX - point.x;
      const dy = currentTargetY - point.y;
      
      point.vx = (point.vx * 0.9) + (dx * 0.05); // Damping and spring
      point.vy = (point.vy * 0.9) + (dy * 0.05);

      // Add noise to velocity
      point.vx += (Math.random() - 0.5) * state.noise * 2;
      point.vy += (Math.random() - 0.5) * state.noise * 2;

      point.x += point.vx;
      point.y += point.vy;

      // Rendering Points
      const px = centerX + point.x + noiseX;
      const py = centerY + point.y + noiseY;

      // Radar visibility calculation
      // Calculate angle of point relative to center
      let pointAngle = Math.atan2(py - centerY, px - centerX);
      if (pointAngle < 0) pointAngle += Math.PI * 2;
      
      // Normalize sweep angle
      let normSweepAngle = sweepAngle % (Math.PI * 2);
      if (normSweepAngle < 0) normSweepAngle += Math.PI * 2;

      // Distance in angle
      let angleDist = Math.abs(pointAngle - normSweepAngle);
      if (angleDist > Math.PI) angleDist = 2 * Math.PI - angleDist;

      // Persistence: Points stay visible longer as confidence increases
      const persistence = lerp(0.5, 5.0, state.confidence); 
      // If the scan just passed, alpha is high. Decays over angle distance.
      // scanHit is 1 when angleDist is 0, 0 when angleDist is large
      const scanHit = Math.max(0, 1 - angleDist * persistence);
      
      // Base visibility + Scan highlight
      // At high confidence, points are always somewhat visible
      const baseAlpha = lerp(0, 0.3, state.confidence);
      const alpha = Math.min(1, baseAlpha + scanHit * state.clarity);

      if (alpha > 0.01) {
        context.beginPath();
        const size = lerp(1, 3, state.confidence) + (scanHit * 2);
        context.arc(px, py, size, 0, Math.PI * 2);
        
        // Color transition: Blue -> Orange (Tension) -> Cyan (Resolved)
        let fill = '';
        if (state.structure < 0.4) {
            // Low structure: Blue/Grey
            fill = `rgba(100, 150, 255, ${alpha})`;
        } else if (state.structure < 0.8) {
            // Tension: Orange/White mix
            // Interpolate based on noise
            const tension = state.noise; 
            fill = `rgba(${lerp(100, 255, tension)}, ${lerp(150, 100, tension)}, ${lerp(255, 100, tension)}, ${alpha})`;
        } else {
            // Resolved: Cyan/Teal
            fill = `rgba(0, 255, 255, ${alpha})`;
        }
        
        context.fillStyle = fill;
        context.fill();
      }

      // Draw Connections (Proximity based, but masked by structure)
      // Only draw connections if structure is high enough or tension is high
      if (state.structure > 0.2) {
          // Optimization: Only connect to a few neighbors to save perf
          // We can use the ID to deterministically check only a few "potential" neighbors in the array
          // In a real grid, neighbors are predictable. 
          // Here we just simulate connection scan.
          const connectionAlpha = alpha * state.structure * 0.4;
          
          if (connectionAlpha > 0.05) {
             // Fake neighbor check by index for performance
             for(let i=1; i<=3; i++) {
                 const neighbor = pointsRef.current[(point.id + i * 7) % pointsRef.current.length];
                 const nx = centerX + neighbor.x; // Neighbor x (approx, ignoring noise for line stability)
                 const ny = centerY + neighbor.y;
                 
                 const distSq = (px - nx)*(px - nx) + (py - ny)*(py - ny);
                 // Only connect if physically close
                 if (distSq < 60 * 60) {
                     context.beginPath();
                     context.moveTo(px, py);
                     context.lineTo(nx, ny);
                     context.strokeStyle = `rgba(0, 255, 255, ${connectionAlpha})`;
                     context.lineWidth = 1;
                     context.stroke();
                 }
             }
          }
      }
    });

    context.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(dpr, dpr);

    // Initial fill
    context.fillStyle = '#050510';
    context.fillRect(0, 0, rect.width, rect.height);

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      // Calculate elapsed time in seconds
      const elapsed = (now - startTimeRef.current) / 1000;
      
      draw(context, elapsed);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050510]">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-8 left-8 text-cyan-400 font-mono pointer-events-none mix-blend-screen">
        <div className="flex flex-col gap-1">
          <span className="text-xs opacity-50 tracking-widest">SYSTEM STATUS</span>
          <span className="text-2xl font-bold tracking-tighter animate-pulse shadow-glow">
            {systemState.phase}
          </span>
          <div className="h-0.5 w-24 bg-cyan-800 mt-1 relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${(systemState.confidence * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none">
        <h1 className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-2 shadow-black drop-shadow-md">
            {systemState.text}
        </h1>
        <p className="text-cyan-300/60 text-xs tracking-widest uppercase">
            {systemState.subtext}
        </p>
      </div>

      {/* Parameter Debug Visualization (Styled as sci-fi bars) */}
      <div className="absolute top-8 right-8 flex flex-col items-end gap-2 pointer-events-none opacity-80">
        <MetricBar label="ENG" value={systemState.energy} color="bg-red-400" />
        <MetricBar label="NOS" value={systemState.noise} color="bg-yellow-400" />
        <MetricBar label="STR" value={systemState.structure} color="bg-blue-400" />
        <MetricBar label="CLA" value={systemState.clarity} color="bg-green-400" />
        <MetricBar label="CNF" value={systemState.confidence} color="bg-white" />
      </div>
      
      {/* Circular Progress in center (Very subtle) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
         <div 
            className="w-[600px] h-[600px] rounded-full border border-cyan-500/10 transition-all duration-500"
            style={{ 
                transform: `translate(-50%, -50%) scale(${0.8 + systemState.energy * 0.1})`,
                opacity: systemState.clarity * 0.2 
            }}
         ></div>
      </div>
    </div>
  );
};

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-200/50">
    <span>{label}</span>
    <div className="w-16 h-1 bg-cyan-900/40">
      <div 
        className={`h-full ${color} shadow-[0_0_5px_currentColor] transition-all duration-100 ease-linear`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

export default Visualization;
