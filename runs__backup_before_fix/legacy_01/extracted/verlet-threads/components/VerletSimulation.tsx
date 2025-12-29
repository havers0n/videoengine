import React, { useEffect, useRef } from 'react';
import { SeededRNG } from '../utils/rng';
import { Point, Constraint, SimConfig, MouseState } from '../types';

interface VerletSimulationProps {
  config: SimConfig;
  seed: number;
}

const VerletSimulation: React.FC<VerletSimulationProps> = ({ config, seed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Simulation State Refs (Mutable, no React re-renders)
  const pointsRef = useRef<Point[]>([]);
  const constraintsRef = useRef<Constraint[]>([]);
  const mouseRef = useRef<MouseState>({ x: -1000, y: -1000, isDown: false });
  const reqIdRef = useRef<number>(0);
  const rngRef = useRef<SeededRNG>(new SeededRNG(seed));

  // Initialize Simulation
  const initSimulation = (width: number, height: number) => {
    const rng = new SeededRNG(seed); // Reset RNG with prop seed
    rngRef.current = rng;
    
    const points: Point[] = [];
    const constraints: Constraint[] = [];
    
    // Create a grid of points
    const rows = 12;
    const cols = 16;
    const spacing = Math.min(width, height) / 20;
    const startX = (width - (cols * spacing)) / 2;
    const startY = (height - (rows * spacing)) / 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = startX + x * spacing;
        const py = startY + y * spacing;
        
        points.push({
          x: px,
          y: py,
          oldX: px - rng.range(-1, 1), // Initial velocity
          oldY: py - rng.range(-1, 1),
          vx: 0,
          vy: 0,
          pinned: y === 0, // Pin the top row
          id: points.length
        });
      }
    }

    // Initial constraints (structural)
    // We don't add them here, we let the dynamic system handle it 
    // OR we add initial neighbors to start with a cloth.
    // Let's add initial neighbors for structure, then allow dynamic breaking.
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        // Connect to right
        if ((i + 1) % cols !== 0) {
            const p2 = points[i + 1];
            constraints.push({ p1, p2, length: spacing, isActive: true });
        }
        // Connect to bottom
        if (i + cols < points.length) {
            const p2 = points[i + cols];
            constraints.push({ p1, p2, length: spacing, isActive: true });
        }
    }

    pointsRef.current = points;
    constraintsRef.current = constraints;
  };

  // Physics Update Loop
  const updatePhysics = (width: number, height: number, cfg: SimConfig) => {
    const points = pointsRef.current;
    const constraints = constraintsRef.current;
    const mouse = mouseRef.current;

    // 1. Verlet Integration & Forces
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pinned) continue;

      const vx = (p.x - p.oldX) * cfg.friction;
      const vy = (p.y - p.oldY) * cfg.friction;

      p.oldX = p.x;
      p.oldY = p.y;

      // Gravity
      p.y += cfg.gravity;

      // Mouse Interaction (Repulsion)
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      const repelRad = 150;
      
      if (distSq < repelRad * repelRad && distSq > 0.1) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / repelRad) * cfg.mouseRepelForce;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        p.x += fx;
        p.y += fy;
      }

      p.x += vx;
      p.y += vy;

      // Boundaries
      if (p.x < 0) { p.x = 0; p.oldX = p.x + vx; }
      else if (p.x > width) { p.x = width; p.oldX = p.x + vx; }
      
      if (p.y < 0) { p.y = 0; p.oldY = p.y + vy; }
      else if (p.y > height) { p.y = height; p.oldY = p.y + vy; }
      
      // Store estimated velocity for visualization
      p.vx = vx;
      p.vy = vy;
    }

    // 2. Constraint Solving (Iterative)
    const iterations = 3;
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < constraints.length; i++) {
        const c = constraints[i];
        if (!c.isActive) continue;

        const dx = c.p2.x - c.p1.x;
        const dy = c.p2.y - c.p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Break Thread Logic
        if (dist > cfg.breakDistance) {
          c.isActive = false;
          continue;
        }

        const diff = c.length - dist;
        const percent = (diff / dist) / 2;
        const offsetX = dx * percent * cfg.stiffness;
        const offsetY = dy * percent * cfg.stiffness;

        if (!c.p1.pinned) {
          c.p1.x -= offsetX;
          c.p1.y -= offsetY;
        }
        if (!c.p2.pinned) {
          c.p2.x += offsetX;
          c.p2.y += offsetY;
        }
      }
    }

    // 3. Dynamic Connectivity (Re-healing)
    // Only check occasionally or on specific events to save perf, 
    // or optimized spatial hash. For N < 500, O(N^2) is roughly acceptable on modern JS engines.
    // We will do a limited search or simply check broken constraints.
    
    // Recover broken constraints if close enough
    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[i];
      if (!c.isActive) {
        const dx = c.p2.x - c.p1.x;
        const dy = c.p2.y - c.p1.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < cfg.connectionDistance * cfg.connectionDistance) {
            c.isActive = true;
            // Reset length to natural distance to avoid instant snap
            // c.length = Math.sqrt(distSq); 
            // OR keep original length but only reconnect if very close.
        }
      }
    }
  };

  // Render Loop
  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number, cfg: SimConfig) => {
    // Trail effect: clear with high transparency
    ctx.fillStyle = `rgba(5, 5, 5, ${1 - cfg.trailAlpha})`;
    ctx.fillRect(0, 0, width, height);

    const points = pointsRef.current;
    const constraints = constraintsRef.current;

    // Draw Constraints (Threads)
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    
    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[i];
      if (!c.isActive) continue;

      const dx = c.p2.x - c.p1.x;
      const dy = c.p2.y - c.p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Visualization: Tension calculation
      // Calculate strain: (current_length - resting_length) / resting_length
      const strain = Math.max(0, (dist - c.length) / c.length);
      
      // Color shifts from cyan (relaxed) to magenta (stressed)
      const r = Math.min(255, Math.floor(strain * 1000)); 
      const b = Math.max(100, 255 - Math.floor(strain * 800));
      
      ctx.strokeStyle = `rgba(${r}, 50, ${b}, ${0.4 + strain})`;
      ctx.shadowBlur = strain * 15;
      ctx.shadowColor = `rgba(${r}, 50, ${b}, 1)`;
      
      ctx.beginPath();
      ctx.moveTo(c.p1.x, c.p1.y);
      ctx.lineTo(c.p2.x, c.p2.y);
      ctx.stroke();
    }
    
    // Reset shadow for points (performance)
    ctx.shadowBlur = 0;

    // Draw Points (Hotspots)
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      
      // Calculate speed for hotspot visualization
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const isHot = speed > 2;

      const radius = isHot ? 3 : 1.5;
      
      if (p.pinned) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
      } else {
        if (isHot) {
            ctx.fillStyle = '#fbbf24'; // Amber-400
            ctx.shadowBlur = 5 + speed * 2;
            ctx.shadowColor = '#fbbf24';
        } else {
            ctx.fillStyle = '#22d3ee'; // Cyan-400
            ctx.shadowBlur = 0;
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Main Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Resize Handler
    const handleResize = () => {
      const { width, height } = container.getBoundingClientRect();
      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Re-init sim if dimensions change significantly or on first load
      if (pointsRef.current.length === 0) {
        initSimulation(width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial setup if resize didn't catch it (sometimes 0 dim on mount)
    if (pointsRef.current.length === 0) {
        const { width, height } = container.getBoundingClientRect();
        initSimulation(width, height);
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      // Calculate delta time if needed for frame independence, 
      // but Verlet usually prefers fixed steps. 
      // We'll assume roughly 60fps or clamp updates.
      // const dt = (time - lastTime) / 1000;
      lastTime = time;

      const { width, height } = container.getBoundingClientRect();

      updatePhysics(width, height, config);
      draw(ctx, width, height, config);

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [config, seed]); // Re-run if config or seed changes drastically (usually we just read ref, but seed change implies reset)

  // Event Listeners for Interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }
  };

  const handleMouseDown = () => { mouseRef.current.isDown = true; };
  const handleMouseUp = () => { mouseRef.current.isDown = false; };
  const handleMouseLeave = () => { 
    mouseRef.current.isDown = false; 
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-black select-none"
    >
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default VerletSimulation;