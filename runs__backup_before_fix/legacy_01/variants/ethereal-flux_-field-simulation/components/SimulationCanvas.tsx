
import React, { useRef, useEffect, useCallback } from 'react';
import { SimConfig, Particle } from '../types';
import { perlin } from '../utils/noise';

interface Props {
  config: SimConfig;
}

const SimulationCanvas: React.FC<Props> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const count = config.particleCount;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        prevX: x,
        prevY: y,
        hue: Math.random() * 360
      });
    }
    particlesRef.current = particles;
  }, [config.particleCount]);

  // Adjust particle count on the fly
  useEffect(() => {
    if (particlesRef.current.length < config.particleCount) {
      const diff = config.particleCount - particlesRef.current.length;
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (let i = 0; i < diff; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesRef.current.push({
          x,
          y,
          vx: 0,
          vy: 0,
          prevX: x,
          prevY: y,
          hue: Math.random() * 360
        });
      }
    } else if (particlesRef.current.length > config.particleCount) {
      particlesRef.current = particlesRef.current.slice(0, config.particleCount);
    }
  }, [config.particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      // Clear with trail effect
      ctx.fillStyle = `rgba(2, 6, 23, ${config.trailAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      timeRef.current += config.noiseSpeed;

      // Draw background field vectors if enabled
      if (config.showField) {
        ctx.save();
        ctx.strokeStyle = `${config.fieldColor}22`;
        ctx.lineWidth = 1;
        const res = config.fieldResolution;
        for (let x = 0; x < canvas.width; x += res) {
          for (let y = 0; y < canvas.height; y += res) {
            const angle = perlin.noise(x * config.noiseScale, y * config.noiseScale, timeRef.current) * Math.PI * 4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * res * 0.5, y + Math.sin(angle) * res * 0.5);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Update and draw particles
      ctx.lineWidth = config.strokeWeight;
      for (const p of particlesRef.current) {
        const angle = perlin.noise(p.x * config.noiseScale, p.y * config.noiseScale, timeRef.current) * Math.PI * 4;
        
        p.vx = Math.cos(angle) * config.particleSpeed;
        p.vy = Math.sin(angle) * config.particleSpeed;
        
        p.prevX = p.x;
        p.prevY = p.y;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = p.prevX = canvas.width;
        if (p.x > canvas.width) p.x = p.prevX = 0;
        if (p.y < 0) p.y = p.prevY = canvas.height;
        if (p.y > canvas.height) p.y = p.prevY = 0;

        if (config.hueRotate) {
          p.hue = (p.hue + 0.5) % 360;
          ctx.strokeStyle = `hsla(${p.hue}, 80%, 60%, 0.8)`;
        } else {
          ctx.strokeStyle = config.particleColor;
        }

        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [config, initParticles]);

  return <canvas ref={canvasRef} className="w-full h-full bg-slate-950" />;
};

export default SimulationCanvas;
