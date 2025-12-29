import React, { useEffect, useRef, useState } from 'react';

// --- Types & Constants ---
const DURATION = 18000; // 18 seconds total loop
const PARTICLE_COUNT = 180;
const MAX_RADIUS = 350;

interface Particle {
  id: number;
  baseAngle: number;
  baseRadius: number;
  noiseOffset: { x: number; y: number };
  speedOffset: number;
  targetGridX: number;
  targetGridY: number;
}

// --- Utils ---
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Generate initial stable random particles
const generateParticles = (width: number, height: number): Particle[] => {
  const particles: Particle[] = [];
  const gridCols = Math.ceil(Math.sqrt(PARTICLE_COUNT));
  const spacing = (Math.min(width, height) * 0.6) / gridCols;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Polar coordinates for the "messy" state
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * MAX_RADIUS * 0.8;

    // Grid coordinates for the "structured" state
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const targetGridX = (col - gridCols / 2) * spacing;
    const targetGridY = (row - gridCols / 2) * spacing;

    particles.push({
      id: i,
      baseAngle: angle,
      baseRadius: radius,
      noiseOffset: { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 },
      speedOffset: Math.random() * 0.5 + 0.5,
      targetGridX,
      targetGridY,
    });
  }
  return particles;
};

const GuardfolioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  
  // State for text overlay which is easier to handle in DOM for clean typography
  const [activeText, setActiveText] = useState<string>("");
  const [textOpacity, setTextOpacity] = useState<number>(0);
  const [timeProgress, setTimeProgress] = useState<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize Data
    const particles = generateParticles(canvas.width, canvas.height);
    
    // Animation Loop
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      
      const elapsed = timestamp - startTimeRef.current;
      const loopTime = elapsed % DURATION;
      const t = loopTime / DURATION; // Normalized 0 -> 1
      const seconds = loopTime / 1000;

      // --- Global Parameter Interpolation ---
      
      // Ranges:
      // 0-6s (0.0 - 0.33): Low Awareness
      // 6-12s (0.33 - 0.66): Turbulence
      // 12-18s (0.66 - 1.0): Stabilization

      // Noise Intensity: Ramps up during turbulence, then cuts to near zero
      let noiseIntensity = 0;
      if (seconds < 6) {
        noiseIntensity = lerp(0.1, 0.3, seconds / 6);
      } else if (seconds < 12) {
        noiseIntensity = lerp(0.3, 1.2, (seconds - 6) / 6); // Peak chaos
      } else {
        noiseIntensity = lerp(1.2, 0.05, smoothstep(0, 1, (seconds - 12) / 2)); // Rapid stabilization
      }

      // Structure Strength: 0 until end phase, then ramps to 1
      let structureStrength = 0;
      if (seconds > 11) {
        structureStrength = smoothstep(11, 15, seconds);
      }

      // Scan Speed:
      let scanSpeed = 1;
      if (seconds > 6 && seconds < 12) scanSpeed = 3;
      if (seconds >= 12) scanSpeed = 0.5;

      // Scan Angle (cumulative)
      const scanAngle = (elapsed * 0.001 * scanSpeed) % (Math.PI * 2);

      // Color Palette Interpolation
      // Phase 1: Gray/Dim (#666)
      // Phase 2: Red/Orange (#ff4400)
      // Phase 3: Teal/Cyan (#00ccff)
      
      let r = 100, g = 100, b = 100; // Default Gray
      
      if (seconds < 6) {
        // Subtle drift
      } else if (seconds < 12) {
        // Drift to warning
        const p = (seconds - 6) / 6;
        r = lerp(100, 255, p);
        g = lerp(100, 68, p);
        b = lerp(100, 0, p);
      } else {
        // Drift to stable
        const p = (seconds - 12) / 6;
        r = lerp(255, 0, p);
        g = lerp(68, 204, p);
        b = lerp(0, 255, p);
      }
      
      const mainColor = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}`;

      // --- Rendering ---

      // Soft trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Draw Radar Scan Line & Gradient
      const gradient = ctx.createConicGradient(scanAngle + Math.PI / 2, 0, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.8, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `${mainColor}, ${seconds < 6 ? 0.1 : 0.3})`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(canvas.width, canvas.height), 0, Math.PI * 2);
      ctx.fill();

      // Draw Particles
      particles.forEach(p => {
        // 1. Calculate unstructured position (Polar + Noise)
        // Add waving noise based on time
        const currentTimeOffset = elapsed * 0.002 * p.speedOffset;
        const turbulentX = Math.cos(p.baseAngle + currentTimeOffset) * p.baseRadius + (Math.sin(currentTimeOffset * 2) * p.noiseOffset.x * noiseIntensity);
        const turbulentY = Math.sin(p.baseAngle + currentTimeOffset) * p.baseRadius + (Math.cos(currentTimeOffset * 2) * p.noiseOffset.y * noiseIntensity);

        // 2. Calculate structured position (Grid)
        const structX = p.targetGridX;
        const structY = p.targetGridY;

        // 3. Interpolate
        const x = lerp(turbulentX, structX, structureStrength);
        const y = lerp(turbulentY, structY, structureStrength);

        // Visibility Calculation (Scan effect)
        // Calculate angle of point
        let pointAngle = Math.atan2(y, x);
        if (pointAngle < 0) pointAngle += Math.PI * 2;
        
        let currentScanAngleNormalized = scanAngle % (Math.PI * 2);
        
        // Distance from scan line (for "ping" effect)
        let angularDist = Math.abs(pointAngle - currentScanAngleNormalized);
        if (angularDist > Math.PI) angularDist = Math.PI * 2 - angularDist; // Wrap around

        // Opacity Logic
        // Base opacity increases with structure
        let baseAlpha = lerp(0.1, 0.6, structureStrength);
        
        // "Ping" brightness when scan passes
        if (angularDist < 0.2) {
            baseAlpha += lerp(0.5, 0.0, angularDist / 0.2);
        }
        
        // Turbulence flickers
        if (noiseIntensity > 0.5 && Math.random() > 0.9) {
             baseAlpha = Math.random();
        }

        ctx.fillStyle = `${mainColor}, ${baseAlpha})`;
        
        // Size pulsation
        const size = lerp(2, 4, structureStrength) + (angularDist < 0.2 ? 2 : 0);

        // Draw shape
        if (structureStrength > 0.8) {
            // Draw Squares/Crosses in stable mode
            const s = size * 1.5;
            ctx.fillRect(x - s/2, y - s/2, s, s);
        } else {
            // Draw circles in chaotic mode
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Connect lines if close and stable
        if (structureStrength > 0.5) {
             // Only draw some connections to avoid lag
             if (p.id % 5 === 0) {
                 ctx.strokeStyle = `${mainColor}, ${structureStrength * 0.2})`;
                 ctx.lineWidth = 1;
                 // Ideally we'd find neighbors, but for perf we just connect to a virtual center or specific nodes
                 // Let's just draw a line to the "row" neighbor in the grid logic for visual cohesion
                 // This requires knowing neighbor coords, approximated here:
                 if (p.id + 1 < particles.length && (p.id + 1) % Math.ceil(Math.sqrt(PARTICLE_COUNT)) !== 0) {
                      // Just a visual hack for connection
                      const nextP = particles[p.id+1];
                       // Re-calc nextP position (simplified)
                      const nextStructX = nextP.targetGridX;
                      const nextStructY = nextP.targetGridY;
                      // We assume nextP is also interpolated similarly
                      // It's expensive to recalc fully, so we skip for this demo or optimize
                      // Optimization: Just draw line to grid neighbor static pos relative to current pos
                 }
             }
        }
      });
      
      // Draw Central HUD Ring
      ctx.strokeStyle = `${mainColor}, 0.3)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Radius pulses with noise
      const hudRadius = 50 + noiseIntensity * 10;
      ctx.arc(0, 0, hudRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw secondary rings
      if (structureStrength > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, hudRadius * 2 * structureStrength, 0, Math.PI * 2);
          ctx.strokeStyle = `${mainColor}, ${structureStrength * 0.2})`;
          ctx.stroke();
      }

      ctx.restore();

      // --- Text Logic Sync ---
      // 0-6s: "Кажется, всё стабильно…"
      // 6-12s: "Но реальность сложнее."
      // 12-18s: "Guardfolio AI. Видит структуру."
      
      let targetText = "";
      let targetOpacity = 0;

      // Text fading logic
      // Phase 1 Text: 1s to 5s
      if (seconds > 1 && seconds < 5) {
          targetText = "Кажется, всё стабильно…";
          targetOpacity = seconds < 2 ? (seconds - 1) : (seconds > 4 ? (5 - seconds) : 1);
      } 
      // Phase 2 Text: 7s to 11s
      else if (seconds > 7 && seconds < 11) {
          targetText = "Но реальность сложнее.";
          targetOpacity = seconds < 8 ? (seconds - 7) : (seconds > 10 ? (11 - seconds) : 1);
      }
      // Phase 3 Text: 13s to 17s
      else if (seconds > 13 && seconds < 17.5) {
          targetText = "Guardfolio AI. Видит структуру.";
          targetOpacity = seconds < 14 ? (seconds - 13) : (seconds > 17 ? (17.5 - seconds) * 2 : 1);
      }

      // Update state sparingly
      setActiveText(prev => {
         if (prev !== targetText && targetText !== "") return targetText;
         return prev;
      });
      setTextOpacity(targetOpacity);
      setTimeProgress(t);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block z-0" />
      
      {/* Dynamic Center Text */}
      <div 
        className="absolute z-20 flex items-center justify-center w-full pointer-events-none"
        style={{ opacity: textOpacity, transition: 'opacity 0.1s linear' }}
      >
        <h2 className={`text-xl md:text-3xl font-light tracking-widest text-center px-4 mix-blend-screen
          ${timeProgress > 0.33 && timeProgress < 0.66 ? 'text-red-500 font-bold glitch-effect' : 
            timeProgress > 0.66 ? 'text-cyan-400 font-mono' : 'text-gray-300 font-serif italic'}
        `}>
          {activeText}
        </h2>
      </div>

      {/* Progress Bar (Bottom) */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent transition-all duration-75 ease-linear z-10"
           style={{ width: '100%', transform: `scaleX(${timeProgress})`, transformOrigin: 'left' }}
      />
    </>
  );
};

export default GuardfolioVisualizer;