import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { WorldState, SimulationConfig } from '../types';
import { createWorld, updatePhysics } from '../logic/physics';

const CONFIG: SimulationConfig = {
  pointCount: 120,
  connectionDistance: 100,
  friction: 0.99,
  gravity: 0.2,
  stiffness: 0.1, // Soft constraint for "thread" feel
  breakThreshold: 2.5, // Break if stretched 2.5x original length
  mouseRepelRadius: 200,
  mouseRepelForce: 2,
};

const SimCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<WorldState | null>(null);
  const reqRef = useRef<number>();
  const prevTimeRef = useRef<number>(0);

  // Initialize World
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    worldRef.current = createWorld(clientWidth, clientHeight, CONFIG);
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !worldRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      canvasRef.current.width = clientWidth;
      canvasRef.current.height = clientHeight;
      worldRef.current.width = clientWidth;
      worldRef.current.height = clientHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Loop
  useLayoutEffect(() => {
    const animate = (time: number) => {
      reqRef.current = requestAnimationFrame(animate);

      if (!prevTimeRef.current) prevTimeRef.current = time;
      const deltaTime = Math.min((time - prevTimeRef.current) * 0.06, 2); // Time scaling
      prevTimeRef.current = time;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const world = worldRef.current;

      if (!canvas || !ctx || !world) return;

      world.time += deltaTime;

      // Update Physics
      updatePhysics(world, deltaTime, CONFIG);

      // Render
      // 1. Trail effect: Fade out existing content
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Alpha trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Constraints (Threads)
      ctx.globalCompositeOperation = 'lighter'; // Additive blending for neon glow
      ctx.lineWidth = 1;
      
      // Batch drawing by color/tension could be faster, but direct loop is fine for N<500
      for (let i = 0; i < world.constraints.length; i++) {
        const c = world.constraints[i];
        const dx = c.p1.x - c.p2.x;
        const dy = c.p1.y - c.p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const strain = dist / c.restLength;
        
        // Color based on strain: Blue (relaxed) -> Purple -> White (breaking)
        const tension = Math.min((strain - 1) / (CONFIG.breakThreshold - 1), 1);
        const r = Math.floor(50 + tension * 205);
        const g = Math.floor(100 + tension * 100);
        const b = Math.floor(255 - tension * 100);
        const alpha = 1 - tension * 0.5; // Fade out as it breaks

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(c.p1.x, c.p1.y);
        ctx.lineTo(c.p2.x, c.p2.y);
        ctx.stroke();
      }

      // 3. Draw Points (Hotspots)
      for (let i = 0; i < world.points.length; i++) {
        const p = world.points[i];
        
        // Shadow/Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
      }
      
      // 4. Draw Mouse Interaction Hint
      if (world.isMouseDown) {
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.arc(world.mouse.x, world.mouse.y, CONFIG.mouseRepelRadius, 0, Math.PI * 2);
         ctx.stroke();
      }
    };

    reqRef.current = requestAnimationFrame(animate);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!worldRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      worldRef.current.mouse.x = e.clientX - rect.left;
      worldRef.current.mouse.y = e.clientY - rect.top;
    }
  };

  const handlePointerDown = () => {
    if (worldRef.current) worldRef.current.isMouseDown = true;
  };

  const handlePointerUp = () => {
    if (worldRef.current) worldRef.current.isMouseDown = false;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="absolute top-4 left-4 pointer-events-none text-white/50 text-xs font-mono select-none">
        <h1 className="text-xl font-bold text-white/90 mb-1">Verlet Threads</h1>
        <p>Dynamic Topology Constraint Solver</p>
        <div className="mt-2 flex flex-col gap-1">
          <span>• Drag to repel/tear threads</span>
          <span>• Trails show velocity history</span>
          <span>• Colors indicate tension (Blue: Low, White: High)</span>
        </div>
      </div>
    </div>
  );
};

export default SimCanvas;