import React, { useEffect, useRef, useState, useMemo } from 'react';
import Overlay from './Overlay';

// ---------------------------
// Constants & Types
// ---------------------------
const TOTAL_DURATION = 18000; // 18 seconds
const PHASE_1_DURATION = 6000;
const PHASE_2_DURATION = 12000;

interface Point {
  x: number;
  y: number;
  angle: number; // Polar angle
  radius: number; // Polar radius (0-1 normalized)
  targetX: number; // For phase 3 lerp
  targetY: number; // For phase 3 lerp
  speed: number;
  phase1Visible: boolean;
  size: number;
}

interface Props {
  isPlaying: boolean;
  onReplay?: () => void;
}

const RadarCanvas: React.FC<Props> = ({ isPlaying, onReplay }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation State
  const [phase, setPhase] = useState<'search' | 'detection' | 'clarity'>('search');
  const [progress, setProgress] = useState(0);

  // Initialize Data Points (Memoized to persist across renders)
  const points = useMemo(() => {
    const pts: Point[] = [];
    const count = 80;
    
    for (let i = 0; i < count; i++) {
      // Random Polar Coordinates for Search/Detection phases
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.7; // Keep away from exact center
      
      // Convert to Cartesian (Normalized -1 to 1) for initial pos
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Organized Grid/Ring for Clarity Phase
      // Let's make a beautiful concentric ring structure with nodes
      const ringIndex = i % 4; // 4 rings
      const itemsInRing = Math.floor(count / 4);
      const ringRadius = 0.3 + (ringIndex * 0.2);
      const ringAngle = ((Math.floor(i / 4) / itemsInRing) * Math.PI * 2);
      
      const targetX = Math.cos(ringAngle) * ringRadius;
      const targetY = Math.sin(ringAngle) * ringRadius;

      pts.push({
        x, 
        y, 
        angle, 
        radius, 
        targetX,
        targetY,
        speed: 0.002 + Math.random() * 0.005,
        phase1Visible: Math.random() > 0.7, // Only some dots show in phase 1
        size: Math.random() * 2 + 1
      });
    }
    return pts;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    let radarAngle = 0;
    
    // Config
    const colorSearch = '#4affc3';
    const colorDanger = '#ff2e2e';
    const colorClarity = '#00e5ff';

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Loop Logic
      const loopTime = elapsed % TOTAL_DURATION;
      const totalProgress = loopTime / TOTAL_DURATION;

      // Determine Phase
      let currentPhase: 'search' | 'detection' | 'clarity' = 'search';
      let phaseTime = 0; // Normalized time within phase (0-1)

      if (loopTime < PHASE_1_DURATION) {
        currentPhase = 'search';
        phaseTime = loopTime / PHASE_1_DURATION;
        setPhase('search');
      } else if (loopTime < PHASE_2_DURATION) {
        currentPhase = 'detection';
        phaseTime = (loopTime - PHASE_1_DURATION) / (PHASE_2_DURATION - PHASE_1_DURATION);
        setPhase('detection');
      } else {
        currentPhase = 'clarity';
        phaseTime = (loopTime - PHASE_2_DURATION) / (TOTAL_DURATION - PHASE_2_DURATION);
        setPhase('clarity');
      }
      setProgress(totalProgress);

      // Canvas Sizing
      // We do this every frame to handle resize smoothly without a separate observer
      // (Optimization: Move to ResizeObserver if performance hit is noticed, but usually fine for simple scenes)
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Soft check to avoid reset flicker
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.45;

      // Reset Context
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity
      ctx.clearRect(0, 0, width, height);

      // --- Screen Shake (Phase 2 Only) ---
      if (currentPhase === 'detection') {
        const shakeIntensity = 5 * Math.sin(phaseTime * Math.PI); // Peak shake in middle of phase
        // Only shake on "beats" or random rapid movement
        if (Math.random() > 0.8) {
           const dx = (Math.random() - 0.5) * shakeIntensity;
           const dy = (Math.random() - 0.5) * shakeIntensity;
           ctx.translate(dx, dy);
        }
      }

      // --- Background Elements ---
      // Grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Concentric circles
      for (let i = 1; i <= 4; i++) {
        ctx.arc(centerX, centerY, maxRadius * (i / 4), 0, Math.PI * 2);
      }
      // Crosshairs
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();

      // --- Radar Logic ---
      
      // Rotation Speed based on phase
      let rotationSpeed = 0.02; // Base calm speed
      if (currentPhase === 'detection') rotationSpeed = 0.05 + (phaseTime * 0.03); // Accelerate
      if (currentPhase === 'clarity') rotationSpeed = 0.01; // Slow and stable

      radarAngle = (radarAngle + rotationSpeed) % (Math.PI * 2);

      // Main Color selection
      let mainColor = colorSearch;
      if (currentPhase === 'detection') mainColor = colorDanger;
      if (currentPhase === 'clarity') mainColor = colorClarity;

      // --- Drawing Points & Connections ---
      
      const activePoints: {x: number, y: number, alpha: number}[] = [];

      points.forEach(p => {
        // Calculate Position
        let px = 0;
        let py = 0;

        if (currentPhase === 'clarity') {
          // Lerp to organized position
          // Using an ease-out function for smooth snapping
          const t = Math.min(1, phaseTime * 1.5); // Fast transition at start of phase
          const ease = 1 - Math.pow(1 - t, 3);
          
          const currentX = p.x + (p.targetX - p.x) * ease;
          const currentY = p.y + (p.targetY - p.y) * ease;
          
          px = centerX + currentX * maxRadius;
          py = centerY + currentY * maxRadius;
        } else {
          // Normal Rotation/Jitter for Phase 1/2
          // In Phase 2, add slight jitter to position to simulate instability
          let jitterX = 0;
          let jitterY = 0;
          if (currentPhase === 'detection') {
             jitterX = (Math.random() - 0.5) * 5;
             jitterY = (Math.random() - 0.5) * 5;
          }

          px = centerX + (Math.cos(p.angle) * p.radius) * maxRadius + jitterX;
          py = centerY + (Math.sin(p.angle) * p.radius) * maxRadius + jitterY;
        }

        // Visibility Logic
        // Calculate angular distance to radar beam
        // Normalize angle difference to -PI to PI
        let angleDiff = p.angle - radarAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        // We only care if the beam has JUST passed it (negative difference, small magnitude)
        // Or if we are in Clarity phase, everything is visible
        let alpha = 0;
        
        if (currentPhase === 'clarity') {
            // Expanding ring effect for transition
            const ringProgress = phaseTime * 3; // speed of expanding ring
            const distFromCenter = Math.sqrt(Math.pow((px - centerX)/maxRadius, 2) + Math.pow((py - centerY)/maxRadius, 2));
            
            if (distFromCenter < ringProgress) {
                alpha = 1;
            } else {
                alpha = 0;
            }
        } else {
            // Radar Sweep Logic
            // Beam width ~ 0.5 radians
            if (angleDiff < 0 && angleDiff > -0.8) {
                // Fade out based on distance from beam head
                alpha = 1 - (Math.abs(angleDiff) / 0.8);
            }
        }

        // Phase 1 filter: Only show some points
        if (currentPhase === 'search' && !p.phase1Visible) {
            alpha = 0;
        }

        // Phase 2: Make things persist longer to create "crowded" feel
        if (currentPhase === 'detection') {
             // Slower decay in detection phase
             if (angleDiff < 0 && angleDiff > -1.5) {
                alpha = 1 - (Math.abs(angleDiff) / 1.5);
             }
             // Add global subtle pulse to red dots
             alpha *= (0.8 + Math.random() * 0.2);
        }

        // Draw Point
        if (alpha > 0.01) {
            ctx.beginPath();
            ctx.fillStyle = mainColor;
            ctx.globalAlpha = alpha;
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = mainColor;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            ctx.globalAlpha = 1;

            activePoints.push({x: px, y: py, alpha});
        }
      });

      // --- Draw Connections (Phase 2 & 3) ---
      if (currentPhase !== 'search') {
         ctx.lineWidth = currentPhase === 'clarity' ? 1.5 : 0.5;
         
         // In phase 2, connections are chaotic and transient
         // In phase 3, they are stable
         
         // Optimization: Don't check every pair, just neighbors in the array or by distance
         // For N=80, N^2 is 6400, which is cheap for JS.
         
         const connectionDistance = maxRadius * 0.25;

         for (let i = 0; i < activePoints.length; i++) {
             for (let j = i + 1; j < activePoints.length; j++) {
                 const p1 = activePoints[i];
                 const p2 = activePoints[j];
                 
                 const dx = p1.x - p2.x;
                 const dy = p1.y - p2.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);

                 if (dist < connectionDistance) {
                     // Opacity is limited by the faintest point involved
                     let connAlpha = Math.min(p1.alpha, p2.alpha) * (1 - dist / connectionDistance);
                     
                     // Boost connection visibility in Clarity phase
                     if (currentPhase === 'clarity') connAlpha *= 0.6;
                     else connAlpha *= 0.3; // Faint in detection

                     if (connAlpha > 0.05) {
                         ctx.beginPath();
                         ctx.strokeStyle = mainColor;
                         ctx.globalAlpha = connAlpha;
                         ctx.moveTo(p1.x, p1.y);
                         ctx.lineTo(p2.x, p2.y);
                         ctx.stroke();
                         ctx.globalAlpha = 1;
                     }
                 }
             }
         }
      }

      // --- Draw Radar Beam (Gradient) ---
      if (currentPhase !== 'clarity') {
          // Standard sweeping beam
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(radarAngle);
          
          // Let's manually fade an arc sector
          for (let b = 0; b < 60; b++) {
              const opacity = 1 - (b / 60);
              ctx.beginPath();
              ctx.strokeStyle = mainColor;
              ctx.globalAlpha = opacity * 0.3; // Base beam opacity
              ctx.lineWidth = 2; // Fill gaps
              // Draw line slightly behind 0 angle
              const bAng = - (b * 0.015); 
              ctx.moveTo(0,0);
              ctx.lineTo(Math.cos(bAng) * maxRadius, Math.sin(bAng) * maxRadius);
              ctx.stroke();
          }
          
          // Leading edge line
          ctx.beginPath();
          ctx.strokeStyle = '#fff'; // Bright white leading edge
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = 2;
          ctx.moveTo(0,0);
          ctx.lineTo(maxRadius, 0);
          ctx.stroke();

          ctx.restore();
      } else {
        // --- Clarity Phase Scanner ---
        // Expanding ring (already handled mostly by point visibility, but let's draw the ring itself)
        const ringProgress = phaseTime * 3; 
        if (ringProgress < 1.5) { // Stop drawing after it passes screen
            ctx.beginPath();
            ctx.strokeStyle = colorClarity;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 20;
            ctx.shadowColor = colorClarity;
            ctx.arc(centerX, centerY, ringProgress * maxRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
      }

      // Loop request
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, points]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} className="block w-full h-full" />
        <Overlay phase={phase} progress={progress} />
        
        {/* Replay Button (appears at end) */}
        {progress > 0.95 && (
            <button 
                onClick={onReplay}
                className="absolute bottom-24 bg-[#00e5ff] text-black px-6 py-2 font-bold tracking-widest hover:bg-white transition-colors z-30"
            >
                REPLAY ANALYSIS
            </button>
        )}
    </div>
  );
};

export default RadarCanvas;