import React, { useRef, useEffect } from 'react';
import { StreamPhase, Particle } from '../types';
import { PHASE_DURATION, TOTAL_CYCLE_DURATION, COLORS } from '../constants';

interface StreamCanvasProps {
  onPhaseChange: (phase: StreamPhase) => void;
}

const PARTICLE_COUNT = 800;
const SPEED_MULTIPLIER = 1.0;

const StreamCanvas: React.FC<StreamCanvasProps> = ({ onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const phaseRef = useRef<StreamPhase>(StreamPhase.FLOW);

  // Initialize particles
  const initParticles = (width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() * 2 + 2) * SPEED_MULTIPLIER,
        vy: 0,
        size: Math.random() * 2 + 1,
        baseY: height / 2 + (Math.random() - 0.5) * (height * 0.4),
        offset: Math.random() * Math.PI * 2,
        color: `rgba(${COLORS[StreamPhase.FLOW]}, 0.8)`,
        life: 1,
      });
    }
    particlesRef.current = particles;
  };

  const updateParticles = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    // Determine Phase based on time modulo
    const cycleTime = time % TOTAL_CYCLE_DURATION;
    let currentPhase = StreamPhase.FLOW;
    let phaseProgress = 0;

    if (cycleTime < PHASE_DURATION) {
      currentPhase = StreamPhase.FLOW;
      phaseProgress = cycleTime / PHASE_DURATION;
    } else if (cycleTime < PHASE_DURATION * 2) {
      currentPhase = StreamPhase.TURBULENCE;
      phaseProgress = (cycleTime - PHASE_DURATION) / PHASE_DURATION;
    } else {
      currentPhase = StreamPhase.CHANNELING;
      phaseProgress = (cycleTime - PHASE_DURATION * 2) / PHASE_DURATION;
    }

    // Report phase change to parent for UI update, but avoid spamming state updates
    if (phaseRef.current !== currentPhase) {
      phaseRef.current = currentPhase;
      onPhaseChange(currentPhase);
    }

    // Trail effect: Draw a semi-transparent rectangle over the previous frame
    // This creates the "motion blur" trail effect without storing history
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Adjust opacity for trail length
    ctx.fillRect(0, 0, width, height);

    // Context settings for drawing
    // We update global settings here but can override per particle
    
    // Draw Channel Lines (only visible in Phase 3 or transitioning to it)
    const channelGap = 100;
    const centerY = height / 2;
    
    if (currentPhase === StreamPhase.CHANNELING) {
        ctx.strokeStyle = `rgba(${COLORS[StreamPhase.CHANNELING]}, ${Math.min(phaseProgress * 2, 1)})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(${COLORS[StreamPhase.CHANNELING]}, 0.8)`;
        
        // Top line
        ctx.beginPath();
        ctx.moveTo(0, centerY - channelGap);
        ctx.lineTo(width, centerY - channelGap);
        ctx.stroke();

        // Bottom line
        ctx.beginPath();
        ctx.moveTo(0, centerY + channelGap);
        ctx.lineTo(width, centerY + channelGap);
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset
    }


    particlesRef.current.forEach((p) => {
      // --- PHYSICS UPDATE ---
      
      // Default Forward Motion
      let targetVx = 3;
      let targetVy = 0;
      let targetColor = COLORS[StreamPhase.FLOW];
      let moveSpeed = 0.05; // Ease factor for velocity changes

      if (currentPhase === StreamPhase.FLOW) {
        targetColor = COLORS[StreamPhase.FLOW];
        
        // Sine wave movement
        targetVx = 4 + Math.sin(time * 0.001 + p.y * 0.01) * 1;
        
        // Gentle flow towards baseY
        const dy = p.baseY - p.y;
        targetVy = dy * 0.02 + Math.sin(p.x * 0.01 + time * 0.002 + p.offset) * 1; 

      } else if (currentPhase === StreamPhase.TURBULENCE) {
        targetColor = COLORS[StreamPhase.TURBULENCE];
        moveSpeed = 0.1; // Respond faster to chaos
        
        // Turbulent Noise
        // Create an "obstacle" in the center-ish
        const obstacleX = width * 0.4;
        const obstacleY = height * 0.5;
        const dx = p.x - obstacleX;
        const dy = p.y - obstacleY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Repulsion force
        if (dist < 200) {
            const force = (200 - dist) / 200;
            // Scatter
            targetVx += (dx / dist) * force * 20;
            targetVy += (dy / dist) * force * 20;
        }

        // General noise
        targetVy += (Math.random() - 0.5) * 5;
        targetVx += (Math.random() - 0.5) * 2;
        
        // Slow down forward momentum slightly to emphasize the swirl
        targetVx = Math.max(targetVx, -2); // Don't go too far back

      } else if (currentPhase === StreamPhase.CHANNELING) {
        targetColor = COLORS[StreamPhase.CHANNELING];
        moveSpeed = 0.08;

        // Accelerate
        targetVx = 12; // High speed

        // Clamp into channel
        const topBound = centerY - channelGap + 10;
        const bottomBound = centerY + channelGap - 10;
        
        if (p.y < topBound) {
            targetVy = (topBound - p.y) * 0.1; // Spring back down
        } else if (p.y > bottomBound) {
            targetVy = (bottomBound - p.y) * 0.1; // Spring back up
        } else {
            // Inside channel: minor stabilization
            targetVy *= 0.9;
        }
      }

      // Apply Velocity Easing
      p.vx += (targetVx - p.vx) * moveSpeed;
      p.vy += (targetVy - p.vy) * moveSpeed;

      // Update Position
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x > width) {
        p.x = -10;
        // Reset Y slightly to prevent clumping
        if (currentPhase === StreamPhase.FLOW) {
            p.y = p.baseY + (Math.random() - 0.5) * 50;
            p.vx = 4; 
            p.vy = 0;
        } else if (currentPhase === StreamPhase.CHANNELING) {
            p.y = centerY + (Math.random() - 0.5) * (channelGap * 1.5); // Spawn inside channel roughly
            p.vx = 10;
            p.vy = 0;
        } else {
             p.y = Math.random() * height;
             p.vx = 2;
        }
      }
      if (p.x < -50) p.x = width; // Just in case backflow

      // Draw Particle
      // We manually implement drawing to avoid ctx.save/restore overhead per particle if possible
      // but changing fillStyle is relatively cheap compared to save/restore.
      ctx.fillStyle = `rgba(${targetColor}, 1)`;
      
      // Rectangles are faster than arcs
      ctx.fillRect(p.x, p.y, p.size * (1 + p.vx * 0.1), p.size); // Stretch based on speed
    });
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        updateParticles(ctx, canvas.width, canvas.height, time);
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle Resize
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles(canvas.width, canvas.height);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    // Start Loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />;
};

export default StreamCanvas;