
import React, { useEffect, useRef, useCallback } from 'react';
import { SystemPhase, Particle, THRESHOLDS } from '../types';

interface Props {
  phase: SystemPhase;
  energy: number;
  onPhaseChange: (phase: SystemPhase) => void;
  onEnergyUpdate: (energy: number) => void;
  onCycleComplete: () => void;
  autoCycle: boolean;
}

const KineticCanvas: React.FC<Props> = ({ 
  phase, 
  energy, 
  onPhaseChange, 
  onEnergyUpdate, 
  onCycleComplete,
  autoCycle 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>();
  const frameCounterRef = useRef<number>(0);

  // Initialize particles once
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 800; i++) {
      particles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        targetX: 0,
        targetY: 0,
        color: '#ffffff',
        size: Math.random() * 2 + 1,
      });
    }
    particlesRef.current = particles;
  }, []);

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Background clearing
    if (phase === SystemPhase.DISCHARGE) {
      ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
    } else {
      ctx.fillStyle = `rgba(0, 0, 0, 0.15)`;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // State thresholds & Transitions
    if (autoCycle && phase === SystemPhase.DORMANT) {
      onPhaseChange(SystemPhase.GATHERING);
    }

    if (phase === SystemPhase.GATHERING) {
      onEnergyUpdate(Math.min(100, energy + 0.3));
      if (energy >= THRESHOLDS.GATHER_TO_SURGE) {
        onPhaseChange(SystemPhase.SURGING);
      }
    } else if (phase === SystemPhase.SURGING) {
      onEnergyUpdate(Math.min(100, energy + 0.5));
      if (energy >= THRESHOLDS.SURGE_TO_DISCHARGE) {
        onPhaseChange(SystemPhase.DISCHARGE);
        frameCounterRef.current = 0;
      }
    } else if (phase === SystemPhase.DISCHARGE) {
      frameCounterRef.current++;
      if (frameCounterRef.current > THRESHOLDS.DISCHARGE_DURATION) {
        onPhaseChange(SystemPhase.COOLING);
        frameCounterRef.current = 0;
        onCycleComplete();
      }
    } else if (phase === SystemPhase.COOLING) {
      onEnergyUpdate(Math.max(0, energy - 1.2));
      frameCounterRef.current++;
      if (frameCounterRef.current > THRESHOLDS.COOLING_DURATION) {
        onPhaseChange(SystemPhase.DORMANT);
        frameCounterRef.current = 0;
      }
    }

    // Particle Physics
    particlesRef.current.forEach(p => {
      switch (phase) {
        case SystemPhase.DORMANT:
          // Drifting
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          p.color = 'rgba(255, 255, 255, 0.2)';
          break;

        case SystemPhase.GATHERING:
          // Attraction to center
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = 0.005 * (energy / 10);
          p.vx += dx * force;
          p.vy += dy * force;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += p.vx;
          p.y += p.vy;
          p.color = `rgba(34, 211, 238, ${0.4 + (energy / 100)})`;
          break;

        case SystemPhase.SURGING:
          // Orbital mechanics
          const sdx = centerX - p.x;
          const sdy = centerY - p.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          // Centripetal + Tangential force
          const orbitForce = 0.02;
          const angle = Math.atan2(sdy, sdx);
          p.vx += sdx * orbitForce + Math.cos(angle + Math.PI/2) * (energy/15);
          p.vy += sdy * orbitForce + Math.sin(angle + Math.PI/2) * (energy/15);
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.x += p.vx;
          p.y += p.vy;
          p.color = `rgba(255, 255, 255, 0.8)`;
          break;

        case SystemPhase.DISCHARGE:
          // Explosion radial
          const edx = p.x - centerX;
          const edy = p.y - centerY;
          const eAngle = Math.atan2(edy, edx);
          const speed = 25 * (1 - frameCounterRef.current / THRESHOLDS.DISCHARGE_DURATION);
          p.x += Math.cos(eAngle) * speed;
          p.y += Math.sin(eAngle) * speed;
          p.color = '#fff';
          break;

        case SystemPhase.COOLING:
          // Friction and settling
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.x += p.vx;
          p.y += p.vy;
          p.color = `rgba(255, 255, 255, ${0.8 * (1 - frameCounterRef.current / THRESHOLDS.COOLING_DURATION)})`;
          break;
      }

      // Drawing
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Visual connection lines if close (GATHERING/SURGING)
      if (phase === SystemPhase.GATHERING || phase === SystemPhase.SURGING) {
         if (p.id % 40 === 0) { // Only some particles to avoid heavy perf cost
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(centerX, centerY);
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.1 * (energy/100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
         }
      }
    });

    requestRef.current = requestAnimationFrame(update);
  }, [phase, energy, autoCycle, onPhaseChange, onEnergyUpdate, onCycleComplete]);

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

  // Animation Loop Setup
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full cursor-none"
    />
  );
};

export default KineticCanvas;
