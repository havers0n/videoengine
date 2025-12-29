import React, { useRef, useEffect } from 'react';
import { TIMING, COLORS, Particle } from '../types';
import { lerp, hexToRgba, easeInOutCubic } from '../utils/math';

interface StoryCanvasProps {
  onPhaseChange: (phase: number) => void;
}

export const StoryCanvas: React.FC<StoryCanvasProps> = ({ onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Initialize particles
  const initParticles = (width: number, height: number) => {
    const count = window.innerWidth < 768 ? 60 : 120;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        originX: Math.random() * width,
        originY: Math.random() * height,
        targetX: null,
        targetY: null,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
    
    // Pre-calculate shield targets for Phase 3
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.25;
    
    // Simple Shield Grid Formation logic
    let gridIndex = 0;
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = scale / (cols/4);

    particles.forEach((p, i) => {
        // Create a shield shape using math
        // y = x^2 approx for bottom, flat top
        const col = (i % cols) - cols/2;
        const row = Math.floor(i / cols) - cols/2;
        
        let tx = centerX + col * spacing * 1.5;
        let ty = centerY + row * spacing * 1.5;
        
        // Shape mask: Shield
        // Normalize coordinates relative to center
        const nx = (tx - centerX) / scale;
        const ny = (ty - centerY) / scale;
        
        // Shield Function: roughly -1 < x < 1, and y < 0.5, y > abs(x)*2 - 1 (pointy bottom)
        // Just force them into a neat grid for now, refined shield look comes from connection lines
        p.targetX = tx;
        p.targetY = ty;
    });

    particlesRef.current = particles;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      
      // Loop time 0 to 18000ms
      const rawElapsed = timestamp - startTimeRef.current;
      const elapsed = rawElapsed % TIMING.TOTAL_DURATION; 
      
      // Calculate Global Progress (0 to 1)
      const progress = elapsed / TIMING.TOTAL_DURATION;

      // Determine Phase
      let phase = 0;
      let phaseProgress = 0; // 0 to 1 within the phase

      if (elapsed < TIMING.PHASE_1_END) {
        phase = 1; // ILLUSION
        phaseProgress = elapsed / TIMING.PHASE_1_END;
        onPhaseChange(1);
      } else if (elapsed < TIMING.PHASE_2_END) {
        phase = 2; // REVEAL
        phaseProgress = (elapsed - TIMING.PHASE_1_END) / (TIMING.PHASE_2_END - TIMING.PHASE_1_END);
        onPhaseChange(2);
      } else {
        phase = 3; // RESOLUTION
        phaseProgress = (elapsed - TIMING.PHASE_2_END) / (TIMING.TOTAL_DURATION - TIMING.PHASE_2_END);
        onPhaseChange(3);
      }

      // --- DRAWING ---

      // Background Clear
      ctx.fillStyle = COLORS.BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera Drift (Zoom Out)
      // Scale starts at 1.2 and moves to 1.0 over 18s
      const currentScale = lerp(1.2, 1.0, progress);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(currentScale, currentScale);
      
      // Glitch Shake Effect (Phase 2 only)
      if (phase === 2) {
         // Intensity ramps up
         const intensity = Math.sin(phaseProgress * Math.PI) * 10;
         const shakeX = (Math.random() - 0.5) * intensity;
         const shakeY = (Math.random() - 0.5) * intensity;
         ctx.translate(shakeX, shakeY);
      }
      
      ctx.translate(-centerX, -centerY);

      // determine current main color
      let r = COLORS.BLUE.r;
      let g = COLORS.BLUE.g;
      let b = COLORS.BLUE.b;

      if (phase === 2) {
         // Lerp Blue to Red
         const t = Math.min(phaseProgress * 2, 1); // Fast transition
         r = lerp(COLORS.BLUE.r, COLORS.RED.r, t);
         g = lerp(COLORS.BLUE.g, COLORS.RED.g, t);
         b = lerp(COLORS.BLUE.b, COLORS.RED.b, t);
      } else if (phase === 3) {
         // Lerp Red to Green
         const t = easeInOutCubic(phaseProgress);
         r = lerp(COLORS.RED.r, COLORS.GREEN.r, t);
         g = lerp(COLORS.RED.g, COLORS.GREEN.g, t);
         b = lerp(COLORS.RED.b, COLORS.GREEN.b, t);
      }

      const mainColorStr = `rgb(${r},${g},${b})`;
      const glowColorStr = `rgba(${r},${g},${b}, 0.5)`;

      // Draw Particles
      particlesRef.current.forEach((p, i) => {
        // UPDATE PHYSICS BASED ON PHASE
        
        if (phase === 1) {
          // Floating
          p.x += p.vx;
          p.y += p.vy;
          
          // Wrap around
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

        } else if (phase === 2) {
          // Collapse / Reveal Risk
          // Pull towards center but shake violently
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          
          p.x += dx * 0.01; // Slow pull
          p.y += dy * 0.01;
          
          // Vibrate
          p.x += (Math.random() - 0.5) * 6;
          p.y += (Math.random() - 0.5) * 6;

        } else if (phase === 3) {
          // Form Shield Grid
          if (p.targetX !== null && p.targetY !== null) {
            // Spring force
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            p.x += dx * 0.08;
            p.y += dy * 0.08;
          }
        }

        // DRAW NODE
        ctx.beginPath();
        ctx.arc(p.x, p.y, phase === 2 ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = mainColorStr;
        
        // Add glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = glowColorStr;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // DRAW CONNECTIONS
      const maxDist = phase === 2 ? 200 : 120; // Connections span further in chaos to look messy
      
      // Optimization: Don't check every pair if count is high, but 120 is fine for double loop
      ctx.lineWidth = phase === 2 ? 0.5 : 1;
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
           const p1 = particlesRef.current[i];
           const p2 = particlesRef.current[j];
           
           const dx = p1.x - p2.x;
           const dy = p1.y - p2.y;
           const dist = Math.sqrt(dx*dx + dy*dy);

           if (dist < maxDist) {
             const alpha = 1 - (dist / maxDist);
             
             ctx.beginPath();
             ctx.moveTo(p1.x, p1.y);
             ctx.lineTo(p2.x, p2.y);
             
             // Chromatic aberration for lines in Phase 2
             if (phase === 2 && Math.random() > 0.5) {
                ctx.strokeStyle = `rgba(${255}, 0, 0, ${alpha})`;
                ctx.stroke();
                // Draw a secondary offset line
                ctx.beginPath();
                ctx.moveTo(p1.x + 2, p1.y);
                ctx.lineTo(p2.x + 2, p2.y);
                ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.5})`;
             } else {
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
             }
             
             ctx.stroke();
           }
        }
      }

      ctx.restore();

      // Draw "Scanning Wave" Transition for Phase 3 start
      if (phase === 3 && phaseProgress < 0.2) {
         const waveY = canvas.height * (phaseProgress / 0.2);
         const grad = ctx.createLinearGradient(0, waveY - 50, 0, waveY);
         grad.addColorStop(0, 'rgba(0, 255, 157, 0)');
         grad.addColorStop(1, 'rgba(0, 255, 157, 0.5)');
         ctx.fillStyle = grad;
         ctx.fillRect(0, 0, canvas.width, waveY);
         
         ctx.beginPath();
         ctx.moveTo(0, waveY);
         ctx.lineTo(canvas.width, waveY);
         ctx.strokeStyle = '#00ff9d';
         ctx.lineWidth = 2;
         ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [onPhaseChange]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 w-full h-full block"
    />
  );
};