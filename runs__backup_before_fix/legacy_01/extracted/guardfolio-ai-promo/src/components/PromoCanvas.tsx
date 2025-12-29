import React, { useRef, useEffect } from 'react';
import { Particle, getCubeFaces, getDepth } from '../utils/math';

interface PromoCanvasProps {
  phase: number; // 0, 1, or 2 passed from parent to sync with UI
}

// Colors for the phases
const THEMES = {
  0: { top: '#f1f5f9', left: '#cbd5e1', right: '#94a3b8' }, // Silver/White (Slate)
  1: { top: '#ff8a80', left: '#ef4444', right: '#b91c1c' }, // Neon Red
  2: { top: '#67e8f9', left: '#06b6d4', right: '#0e7490' }, // Cyan
};

export const PromoCanvas: React.FC<PromoCanvasProps> = ({ phase }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);
  
  // Initialize Particles
  useEffect(() => {
    const p: Particle[] = [];
    for (let i = 0; i < 300; i++) {
      p.push({
        id: i,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        z: (Math.random() - 0.5) * 100,
        vx: 0, vy: 0, vz: 0,
        scale: 1
      });
    }
    particlesRef.current = p;
  }, []);

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Time scaling
    const t = time * 0.001;
    timeRef.current = t;

    // Shake Effect for Storm Phase (Phase 1 in 0-indexed logic? Parent sends 0,1,2)
    let shakeX = 0;
    let shakeY = 0;
    if (phase === 1) {
      shakeX = (Math.random() - 0.5) * 10;
      shakeY = (Math.random() - 0.5) * 10;
    }

    // Update Particles Physics
    particlesRef.current.forEach((p, i) => {
      let tx = 0, ty = 0, tz = 0;

      // --- STATE MACHINE ---
      
      if (phase === 0) {
        // PHASE 1: FLOW (Sine Wave River)
        // Spread along X, sine wave on Y
        const spread = 20; 
        const speed = 2;
        // Map index to a grid-like flow
        const row = Math.floor(i / 10);
        const col = i % 10;
        
        tx = (col - 4.5) * 50 + Math.sin(t + row * 0.5) * 20;
        ty = Math.sin(t * speed + (p.id * 0.1)) * 50; 
        tz = (row - 15) * 30 + (t * 50 % 1000) - 500; // Moving forward
        
        // Loop Z to create endless river effect
        if (tz > 300) tz -= 900;
        
      } else if (phase === 1) {
        // PHASE 2: STORM (Vortex)
        // Tornado shape: Radius increases with height (Y)
        const angle = t * 3 + (p.id * 0.1);
        const height = (Math.sin(t + p.id) * 300); // Chaotic up/down
        const radius = 100 + Math.abs(height) * 0.8 + Math.sin(t * 10 + p.id) * 50; // Expansive
        
        tx = Math.cos(angle) * radius;
        tz = Math.sin(angle) * radius;
        ty = height;

      } else {
        // PHASE 3: STRUCTURE (Sphere)
        // Fibonacci Sphere distribution or simple polar
        const radius = 250;
        const phi = Math.acos(1 - 2 * (i + 0.5) / 300);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + t * 0.5; // Golden ratio spiral + rotation
        
        tx = radius * Math.sin(phi) * Math.cos(theta);
        ty = radius * Math.sin(phi) * Math.sin(theta);
        tz = radius * Math.cos(phi);
      }

      // Physics Interpolation (Ease towards target)
      // Use a "spring" factor based on phase
      const ease = phase === 1 ? 0.05 : 0.08; // Storm is looser, Structure is snappy
      p.x += (tx - p.x) * ease;
      p.y += (ty - p.y) * ease;
      p.z += (tz - p.z) * ease;
    });

    // Sort by depth (Painter's Algorithm)
    particlesRef.current.sort((a, b) => getDepth(b) - getDepth(a));

    // Draw Loop
    const colors = THEMES[phase as keyof typeof THEMES];
    
    particlesRef.current.forEach((p) => {
      // Scale calculation based on Z for perspective illusion
      // Simple perspective: scale = fov / (fov + z)
      // But for pure isometric, scale is constant. 
      // We will add a slight perspective scale for drama.
      const fov = 800;
      const perspective = Math.max(0.1, fov / (fov - p.z)); // Inverted Z logic for camera
      
      // Project 3D -> 2D
      // We use a simplified isometric projection math inline for performance + tweaks
      // x_screen = (x - z) * cos(30)
      // y_screen = y + (x + z) * sin(30) * -1 (since Y is up)
      
      const isoX = (p.x - p.z) * 0.866;
      const isoY = p.y * -1 + (p.x + p.z) * 0.5;

      const screenX = cx + isoX * perspective + shakeX;
      const screenY = cy + isoY * perspective + shakeY;

      // Base size of cube
      const size = 12 * perspective;

      const { top, left, right } = getCubeFaces(screenX, screenY, size);

      // Helper to draw path
      const drawPoly = (points: {x: number, y: number}[], color: string) => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let j = 1; j < points.length; j++) {
          ctx.lineTo(points[j].x, points[j].y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        // Slight stroke for definition
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      drawPoly(top, colors.top);
      drawPoly(left, colors.left);
      drawPoly(right, colors.right);
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    // Handle resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]); // Re-bind animate when phase changes to pick up new colors

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full block"
      style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}
    />
  );
};