import React, { useEffect, useRef, useCallback } from 'react';
import { SeededRNG } from '../utils/rng';
import { Point, Constraint, Hotspot } from '../types';

// Simulation Constants
const FRICTION = 0.98;
const GRAVITY = 0.15;
const BOUNCE = 0.7;
const ITERATIONS = 5; // Constraint solver iterations
const TEAR_THRESHOLD = 3.5; // Stretch factor to break
const RECONNECT_DIST = 60; // Distance to form new connection
const MOUSE_INFLUENCE_RADIUS = 150;
const MOUSE_FORCE = 2.0;
const BASE_LINK_DIST = 40;

interface VerletCanvasProps {
  seed: number;
  debug?: boolean;
}

export const VerletCanvas: React.FC<VerletCanvasProps> = ({ seed, debug = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs for state that mutates rapidly (no React state updates in RAF)
  const stateRef = useRef<{
    points: Point[];
    constraints: Constraint[];
    hotspots: Hotspot[];
    mouse: { x: number; y: number; active: boolean };
    rng: SeededRNG;
    width: number;
    height: number;
    frames: number;
  }>({
    points: [],
    constraints: [],
    hotspots: [],
    mouse: { x: 0, y: 0, active: false },
    rng: new SeededRNG(seed),
    width: 0,
    height: 0,
    frames: 0,
  });

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // --- Initialization ---
  const initSimulation = useCallback((width: number, height: number) => {
    const rng = new SeededRNG(seed);
    const cols = Math.floor(width / BASE_LINK_DIST) - 2;
    const rows = Math.floor(height / BASE_LINK_DIST) - 2;
    const points: Point[] = [];
    const constraints: Constraint[] = [];
    const hotspots: Hotspot[] = [];

    // Create Grid of Points
    const offsetX = (width - cols * BASE_LINK_DIST) / 2;
    const offsetY = (height - rows * BASE_LINK_DIST) / 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = offsetX + x * BASE_LINK_DIST + rng.range(-5, 5);
        const py = offsetY + y * BASE_LINK_DIST + rng.range(-5, 5);
        
        // Pin corners
        const pinned = (y === 0 && x % 4 === 0);

        points.push({
          id: points.length,
          x: px,
          y: py,
          oldX: px - rng.range(-1, 1), // Initial velocity
          oldY: py - rng.range(-1, 1),
          pinned,
          mass: 1,
          color: pinned ? '#ff00aa' : (rng.bool() ? '#00f3ff' : '#ffffff'),
        });
      }
    }

    // Connect Initial Neighbors (Grid topology)
    const getIdx = (x: number, y: number) => y * cols + x;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p1 = points[getIdx(x, y)];

        if (x < cols - 1) {
          const p2 = points[getIdx(x + 1, y)];
          constraints.push({
            id: `${p1.id}-${p2.id}`,
            p1, p2,
            length: BASE_LINK_DIST,
            stiffness: 0.9,
            breakingThreshold: TEAR_THRESHOLD,
            active: true
          });
        }
        if (y < rows - 1) {
          const p2 = points[getIdx(x, y + 1)];
          constraints.push({
            id: `${p1.id}-${p2.id}`,
            p1, p2,
            length: BASE_LINK_DIST,
            stiffness: 0.9,
            breakingThreshold: TEAR_THRESHOLD,
            active: true
          });
        }
      }
    }

    // Add random hotspots
    for (let i = 0; i < 3; i++) {
        hotspots.push({
            x: rng.range(100, width - 100),
            y: rng.range(100, height - 100),
            radius: rng.range(100, 200),
            strength: rng.bool() ? 0.5 : -0.5,
            color: rng.bool() ? '#ffe600' : '#ff00aa'
        });
    }

    stateRef.current = {
      ...stateRef.current,
      points,
      constraints,
      hotspots,
      rng,
      width,
      height,
      frames: 0
    };
  }, [seed]);

  // --- Physics Engine ---
  
  const updatePoints = (dt: number) => {
    const { points, width, height, mouse, hotspots } = stateRef.current;
    
    // We can assume a somewhat fixed step for simplicity in this demo, 
    // or use dt for more precision. Verlet typically assumes fixed dt.
    // We will just use the loop logic directly.

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pinned) continue;

      const vx = (p.x - p.oldX) * FRICTION;
      const vy = (p.y - p.oldY) * FRICTION;

      p.oldX = p.x;
      p.oldY = p.y;
      p.x += vx;
      p.y += vy;
      p.y += GRAVITY;

      // Mouse Interaction
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < MOUSE_INFLUENCE_RADIUS * MOUSE_INFLUENCE_RADIUS && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / MOUSE_INFLUENCE_RADIUS) * MOUSE_FORCE;
          // Repel
          p.x += (dx / dist) * force * 5;
          p.y += (dy / dist) * force * 5;
        }
      }

      // Hotspot Interaction
      for (const h of hotspots) {
        const dx = p.x - h.x;
        const dy = p.y - h.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < h.radius * h.radius && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / h.radius) * h.strength;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
        }
      }

      // Screen Bounds
      if (p.x > width) { p.x = width; p.oldX = p.x + vx * BOUNCE; }
      else if (p.x < 0) { p.x = 0; p.oldX = p.x + vx * BOUNCE; }
      
      if (p.y > height) { p.y = height; p.oldY = p.y + vy * BOUNCE; }
      else if (p.y < 0) { p.y = 0; p.oldY = p.y + vy * BOUNCE; }
    }
  };

  const solveConstraints = () => {
    const { constraints, points } = stateRef.current;
    
    // Solve Distance Constraints
    for (let i = 0; i < ITERATIONS; i++) {
      for (let c = 0; c < constraints.length; c++) {
        const constraint = constraints[c];
        if (!constraint.active) continue;

        const { p1, p2 } = constraint;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist === 0) continue;

        // Check for breaking
        if (i === 0 && dist > constraint.length * constraint.breakingThreshold) {
            constraint.active = false;
            continue;
        }

        const diff = (dist - constraint.length) / dist;
        const offset = diff * 0.5 * constraint.stiffness;
        
        const offsetX = dx * offset;
        const offsetY = dy * offset;

        if (!p1.pinned) {
          p1.x += offsetX;
          p1.y += offsetY;
        }
        if (!p2.pinned) {
          p2.x -= offsetX;
          p2.y -= offsetY;
        }
      }
    }

    // Dynamic Reconnection (Grid-based or Simplified N^2 for performance since N ~ 200)
    // To ensure 60fps on mobile with React, we limit this check to run every 10 frames
    // or use a spatial hash. Here we use a stochastic approach: check random subsets.
    
    if (stateRef.current.frames % 10 === 0) {
        // Simple stochastic spatial check
        // Check 50 random pairs
        const rng = stateRef.current.rng;
        for(let k=0; k<50; k++) {
            const pA = rng.pick(points);
            const pB = rng.pick(points);
            if (pA === pB) continue;

            const dx = pA.x - pB.x;
            const dy = pA.y - pB.y;
            const distSq = dx*dx + dy*dy;

            // Connect if close enough
            if (distSq < RECONNECT_DIST * RECONNECT_DIST) {
                // Check if connection already exists
                const exists = constraints.find(c => 
                    c.active && ((c.p1 === pA && c.p2 === pB) || (c.p1 === pB && c.p2 === pA))
                );
                
                if (!exists) {
                     constraints.push({
                        id: `${pA.id}-${pB.id}-${stateRef.current.frames}`,
                        p1: pA, p2: pB,
                        length: Math.sqrt(distSq),
                        stiffness: 0.5, // New links are weaker/looser initially
                        breakingThreshold: TEAR_THRESHOLD,
                        active: true
                    });
                }
            }
        }
    }
    
    // Cleanup broken constraints periodically
    if (stateRef.current.frames % 60 === 0) {
        stateRef.current.constraints = constraints.filter(c => c.active);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Trail effect
    ctx.fillStyle = 'rgba(10, 10, 15, 0.25)'; // Dark background with alpha for trails
    ctx.fillRect(0, 0, width, height);

    const { points, constraints, hotspots } = stateRef.current;

    // Draw Hotspots
    for (const h of hotspots) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fillStyle = h.strength > 0 ? 'rgba(255, 0, 100, 0.05)' : 'rgba(0, 243, 255, 0.05)';
        ctx.fill();
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Draw Constraints (Threads)
    ctx.lineWidth = 1;
    // Batch draw by color/state if needed, but simple iteration is fine for Canvas API
    ctx.beginPath();
    for (const c of constraints) {
        if (!c.active) continue;
        // Optimization: Don't draw if off screen (not strictly necessary for this scale)
        ctx.moveTo(c.p1.x, c.p1.y);
        ctx.lineTo(c.p2.x, c.p2.y);
    }
    // Gradient stroke for constraints? Expensive. Let's use shadowBlur.
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#00f3ff';
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.stroke();
    
    // Draw Stressed Constraints differently (about to break)
    ctx.beginPath();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 0, 100, 0.6)';
    for (const c of constraints) {
        if (!c.active) continue;
        const dx = c.p1.x - c.p2.x;
        const dy = c.p1.y - c.p2.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d > c.length * 1.5) {
            ctx.moveTo(c.p1.x, c.p1.y);
            ctx.lineTo(c.p2.x, c.p2.y);
        }
    }
    ctx.stroke();

    // Draw Points
    // Reset shadow for performance or change it
    ctx.shadowBlur = 6;
    for (const p of points) {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.pinned ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0; // Reset
  };

  const loop = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Safety cap on delta to prevent explosion on tab switch
    const dt = Math.min(delta, 50);

    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            updatePoints(dt);
            solveConstraints();
            draw(ctx, canvas.width, canvas.height);
        }
    }
    
    stateRef.current.frames++;
    requestRef.current = requestAnimationFrame(loop);
  };

  // --- Event Handlers ---

  const handleResize = () => {
    if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Only resize if significantly different to avoid mobile URL bar jump issues
        if (Math.abs(canvasRef.current.width - clientWidth) > 50 || 
            Math.abs(canvasRef.current.height - clientHeight) > 50) {
            
            canvasRef.current.width = clientWidth;
            canvasRef.current.height = clientHeight;
            initSimulation(clientWidth, clientHeight);
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    stateRef.current.mouse.x = clientX - rect.left;
    stateRef.current.mouse.y = clientY - rect.top;
    stateRef.current.mouse.active = true;
  };

  const handleMouseLeave = () => {
    stateRef.current.mouse.active = false;
  };
  
  const handleTap = () => {
      // Create an explosion force at mouse position
      const { mouse, points } = stateRef.current;
      if (!mouse.active) return;
      
      for(const p of points) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 200) {
              const force = 20;
              p.oldX = p.x - (dx/dist) * force;
              p.oldY = p.y - (dy/dist) * force;
          }
      }
  };

  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        initSimulation(clientWidth, clientHeight);
    }

    requestRef.current = requestAnimationFrame(loop);
    
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [initSimulation]); // Re-run if init changes (seed changes)

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#0a0a0f] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block touch-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleTap}
        onTouchStart={handleMouseMove} // Init touch position
      />
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <h1 className="text-2xl font-bold text-white tracking-tighter mix-blend-difference">
          NEURAL <span className="text-cyan-400">WEB</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          VERLET INTEGRATION // {stateRef.current.points.length} NODES
        </p>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
        <div className="px-4 py-2 bg-black/50 backdrop-blur border border-white/10 rounded-full text-xs text-cyan-300 font-mono">
          Interactive Canvas: Drag to Repel • Click to Pulse
        </div>
      </div>
    </div>
  );
};
