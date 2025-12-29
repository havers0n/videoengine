import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Node, Edge, Anchor, Hotspot, SimState } from './types';

// --- Constants ---
const TARGET_FPS = 60;
const TIME_STEP = 1 / TARGET_FPS;
const DURATION = 18; // seconds
const GRID_COLS = 16;
const GRID_ROWS = 12;
const CONSTRAINT_ITERATIONS = 5;
const FRICTION = 0.98;
const GRAVITY = 50; // Weak gravity

// --- Deterministic RNG (LCG) ---
class Random {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  // Simulation State (Mutable Ref to avoid React renders in loop)
  const simState = useRef<SimState>({
    nodes: [],
    edges: [],
    anchors: [],
    hotspots: [],
    time: 0,
    width: 0,
    height: 0,
  });

  // Animation Frame Ref
  const reqId = useRef<number | null>(null);

  // --- Initialization ---
  const initSimulation = useCallback((width: number, height: number) => {
    const rng = new Random(12345); // Fixed Seed
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const anchors: Anchor[] = [];
    const hotspots: Hotspot[] = [];

    const spacingX = (width * 0.6) / GRID_COLS;
    const spacingY = (height * 0.6) / GRID_ROWS;
    const startX = (width - spacingX * GRID_COLS) / 2;
    const startY = (height - spacingY * GRID_ROWS) / 2;

    // 1. Create Nodes (Grid)
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const posX = startX + x * spacingX + rng.range(-5, 5);
        const posY = startY + y * spacingY + rng.range(-5, 5);
        nodes.push({
          id: nodes.length,
          x: posX,
          y: posY,
          oldX: posX, // + rng.range(-1, 1), // Initial velocity 0
          oldY: posY,
          pinned: false,
          mass: 1,
        });
      }
    }

    // 2. Create Constraints (Structural)
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const i = y * GRID_COLS + x;
        // Right neighbor
        if (x < GRID_COLS - 1) {
          const right = i + 1;
          const dist = Math.hypot(nodes[right].x - nodes[i].x, nodes[right].y - nodes[i].y);
          edges.push({ p1: i, p2: right, length: dist, tension: 0 });
        }
        // Bottom neighbor
        if (y < GRID_ROWS - 1) {
          const bottom = i + GRID_COLS;
          const dist = Math.hypot(nodes[bottom].x - nodes[i].x, nodes[bottom].y - nodes[i].y);
          edges.push({ p1: i, p2: bottom, length: dist, tension: 0 });
        }
        // Shear (Diagonal) - randomness adds organic feel
        if (x < GRID_COLS - 1 && y < GRID_ROWS - 1 && rng.next() > 0.6) {
           const diag = i + GRID_COLS + 1;
           const dist = Math.hypot(nodes[diag].x - nodes[i].x, nodes[diag].y - nodes[i].y);
           edges.push({ p1: i, p2: diag, length: dist, tension: 0 });
        }
      }
    }

    // 3. Create Anchors
    // We create 6 anchors. Initially they are near the corners/edges.
    // In Phase 3, they will move to form a Hexagon.
    const centerX = width / 2;
    const centerY = height / 2;
    const anchorRadius = Math.min(width, height) * 0.35;

    for (let i = 0; i < 6; i++) {
        // Initial random placements around the canvas
        const initX = rng.range(width * 0.1, width * 0.9);
        const initY = rng.range(height * 0.1, height * 0.9);
        
        // Target Geometric placement (Hexagon)
        const angle = (i / 6) * Math.PI * 2;
        const targetX = centerX + Math.cos(angle) * anchorRadius;
        const targetY = centerY + Math.sin(angle) * anchorRadius;

        anchors.push({
            x: initX,
            y: initY,
            targetX,
            targetY,
            strength: 0 // Will modulate over time
        });
    }

    // 4. Create Hotspots
    for(let i=0; i<3; i++) {
        hotspots.push({
            x: width/2,
            y: height/2,
            radius: 150 + rng.range(0, 50),
            force: 0,
            frequency: 1 + rng.next(),
            phaseOffset: rng.next() * Math.PI * 2
        });
    }

    simState.current = {
      nodes,
      edges,
      anchors,
      hotspots,
      time: 0,
      width,
      height,
    };
    
    // Initial draw to clear screen
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0,0,width,height);
    }

    setDisplayTime(0);
    setIsFinished(false);
  }, []);

  // --- Physics Update ---
  const updatePhysics = (dt: number) => {
    const s = simState.current;
    const t = s.time;

    // --- Phase Logic ---
    // Phase 1 (0-6s): Calm. Green. Minimal external forces.
    // Phase 2 (6-12s): Chaos. Hotspots activate. Red.
    // Phase 3 (12-18s): Order. Anchors pull tight. Geometric.
    
    let phase = 0; 
    if (t > 6) phase = 1;
    if (t > 12) phase = 2;

    const chaosFactor = Math.max(0, Math.min(1, (t - 6) / 2)) * Math.max(0, Math.min(1, (12 - t) / 2)); 
    // Ramp up at 6, ramp down at 12
    const orderFactor = Math.max(0, Math.min(1, (t - 12) / 3));

    // Update Hotspots
    s.hotspots.forEach((h, i) => {
        // Move hotspots in sine waves
        h.x = s.width/2 + Math.sin(t * h.frequency + h.phaseOffset) * (s.width * 0.3);
        h.y = s.height/2 + Math.cos(t * h.frequency * 0.7) * (s.height * 0.3);
        
        // Force is high during chaos phase
        h.force = (phase === 1 || (t > 5 && t < 13)) ? 2000 : 0; 
    });

    // Update Anchors
    s.anchors.forEach((a, i) => {
        // Interpolate position towards target in Phase 3
        if (orderFactor > 0) {
            a.x = a.x + (a.targetX - a.x) * 0.02; // Smooth lerp
            a.y = a.y + (a.targetY - a.y) * 0.02;
            a.strength = 0.005 * orderFactor; // Pull stronger as we get more ordered
        } else {
            // Wander slightly in early phases
            a.x += Math.sin(t + i) * 0.5;
            a.y += Math.cos(t + i) * 0.5;
            a.strength = 0.0005; // Weak hold
        }
    });

    // 1. Verlet Integration & Accumulate Forces
    for (let i = 0; i < s.nodes.length; i++) {
      const n = s.nodes[i];
      if (n.pinned) continue;

      // Current Velocity
      const vx = (n.x - n.oldX) * FRICTION;
      const vy = (n.y - n.oldY) * FRICTION;

      // Save old pos
      n.oldX = n.x;
      n.oldY = n.y;

      // Apply Gravity (light constant down pull)
      let ax = 0;
      let ay = GRAVITY;

      // Apply Hotspots (Repulsion)
      for (const h of s.hotspots) {
          if (h.force <= 0.1) continue;
          const dx = n.x - h.x;
          const dy = n.y - h.y;
          const distSq = dx*dx + dy*dy;
          const radiusSq = h.radius * h.radius;
          
          if (distSq < radiusSq && distSq > 0.1) {
              const dist = Math.sqrt(distSq);
              const strength = (1 - dist / h.radius) * h.force;
              ax += (dx / dist) * strength;
              ay += (dy / dist) * strength;
          }
      }

      // Apply Anchor Pull (Attraction to nearest or specific anchors)
      // To create clusters, let's map nodes to anchors based on index
      if (orderFactor > 0) {
          const anchorIdx = i % s.anchors.length;
          const anchor = s.anchors[anchorIdx];
          const dx = anchor.x - n.x;
          const dy = anchor.y - n.y;
          ax += dx * anchor.strength * 500; // Strong pull in order phase
          ay += dy * anchor.strength * 500;
      } else {
          // General weak centering
           const dx = (s.width/2) - n.x;
           const dy = (s.height/2) - n.y;
           ax += dx * 0.5;
           ay += dy * 0.5;
      }

      // Update Position (Verlet)
      n.x += vx + ax * dt * dt;
      n.y += vy + ay * dt * dt;

      // Wall Clamping (prevent explosion)
      const padding = 20;
      if (n.x < padding) { n.x = padding; n.oldX = n.x + vx * -0.5; }
      if (n.x > s.width - padding) { n.x = s.width - padding; n.oldX = n.x + vx * -0.5; }
      if (n.y < padding) { n.y = padding; n.oldY = n.y + vy * -0.5; }
      if (n.y > s.height - padding) { n.y = s.height - padding; n.oldY = n.y + vy * -0.5; }
    }

    // 2. Constraints relaxation
    for (let k = 0; k < CONSTRAINT_ITERATIONS; k++) {
      for (let i = 0; i < s.edges.length; i++) {
        const e = s.edges[i];
        const n1 = s.nodes[e.p1];
        const n2 = s.nodes[e.p2];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy);

        if (dist === 0) continue;

        // Calculate visual tension for rendering later
        if (k === CONSTRAINT_ITERATIONS - 1) {
            e.tension = dist / e.length;
        }

        const diff = (dist - e.length) / dist;
        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;

        // Apply correction
        if (!n1.pinned) {
          n1.x += offsetX;
          n1.y += offsetY;
        }
        if (!n2.pinned) {
          n2.x -= offsetX;
          n2.y -= offsetY;
        }
      }
    }
  };

  // --- Rendering ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    const s = simState.current;
    
    // 1. Trails / Fade effect
    // Using a low opacity fillRect creates a trail/motion blur effect
    ctx.fillStyle = 'rgba(5, 5, 8, 0.2)'; 
    ctx.fillRect(0, 0, s.width, s.height);

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    // Narrative Colors
    const t = s.time;
    // 0-6: Green/Teal
    // 6-12: Red/Orange (Danger)
    // 12-18: Blue/White (Geometric/Tech)
    
    // 2. Draw Edges
    // Batch stroke calls by color/tension roughly for performance, 
    // but individually is fine for < 500 edges.
    
    for (let i = 0; i < s.edges.length; i++) {
        const e = s.edges[i];
        const n1 = s.nodes[e.p1];
        const n2 = s.nodes[e.p2];
        const tension = e.tension;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);

        // Color Logic
        if (t < 6) {
            // Calm: Greenish, tension changes lightness
            const l = Math.min(100, 40 + tension * 20);
            ctx.strokeStyle = `hsl(160, 80%, ${l}%)`;
            ctx.globalAlpha = 0.4;
        } else if (t < 12) {
            // Chaos: Red/Orange based on extreme tension
            if (tension > 1.5) {
                ctx.strokeStyle = `rgba(255, 50, 50, ${Math.min(1, tension - 1)})`;
                ctx.globalAlpha = 0.8;
            } else {
                ctx.strokeStyle = `rgba(150, 50, 0, 0.3)`;
                ctx.globalAlpha = 0.3;
            }
        } else {
            // Order: Blue/Cyan/White
            const val = Math.min(255, (tension * 100));
            ctx.strokeStyle = `rgba(${val}, ${val}, 255, 0.4)`;
            ctx.globalAlpha = 0.4;
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Draw Nodes (Glow)
    // Only draw every Nth node to reduce clutter, or draw all small
    ctx.shadowBlur = 4;
    for (let i = 0; i < s.nodes.length; i++) {
        const n = s.nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
        
        if (t < 6) {
            ctx.fillStyle = '#4ade80';
            ctx.shadowColor = '#4ade80';
        } else if (t < 12) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
        } else {
            ctx.fillStyle = '#60a5fa';
            ctx.shadowColor = '#60a5fa';
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 4. Draw Anchors (Visual debugging + Order phase visual)
    if (t > 11) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        for(let a of s.anchors) {
             ctx.moveTo(a.x + 5, a.y);
             ctx.arc(a.x, a.y, 5, 0, Math.PI*2);
        }
        ctx.stroke();
    }

    // 5. Draw Hotspots (During chaos)
    if (t > 5 && t < 13) {
        for(let h of s.hotspots) {
            if (h.force > 100) {
                const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
                grad.addColorStop(0, 'rgba(255, 100, 50, 0.2)');
                grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
  };

  // --- Main Loop ---
  useEffect(() => {
    if (!isPlaying) {
        if (reqId.current) cancelAnimationFrame(reqId.current);
        return;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Handle Resize
    const { clientWidth, clientHeight } = container;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
        initSimulation(clientWidth, clientHeight);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        
        // Cap dt to prevent spiral of death if tab backgrounded
        const safeDt = Math.min(dt, 0.1); 
        
        accumulator += safeDt;

        let steps = 0;
        while (accumulator >= TIME_STEP) {
            // Check if finished
            if (simState.current.time >= DURATION) {
                setIsPlaying(false);
                setIsFinished(true);
                return;
            }

            updatePhysics(TIME_STEP);
            simState.current.time += TIME_STEP;
            accumulator -= TIME_STEP;
            steps++;
            // Safety break for extremely slow devices
            if (steps > 10) {
                accumulator = 0; 
                break;
            }
        }
        
        // Interpolation could go here for extra smoothness, 
        // but simple Verlet is usually smooth enough at 60fps.
        draw(ctx);
        
        // Sync UI time occasionally
        if (simState.current.time % 0.5 < TIME_STEP) {
             setDisplayTime(simState.current.time);
        }

        reqId.current = requestAnimationFrame(loop);
    };

    reqId.current = requestAnimationFrame(loop);

    return () => {
        if (reqId.current) cancelAnimationFrame(reqId.current);
    };
  }, [isPlaying, initSimulation]);

  // Initial setup on mount
  useEffect(() => {
      const { clientWidth, clientHeight } = containerRef.current!;
      initSimulation(clientWidth, clientHeight);
      setIsPlaying(true);
  }, [initSimulation]);

  const handleRestart = () => {
      const { clientWidth, clientHeight } = containerRef.current!;
      initSimulation(clientWidth, clientHeight);
      setIsPlaying(true);
  };

  const getPhaseName = () => {
      const t = displayTime;
      if (t < 6) return "PHASE 1: STABLE EQUILIBRIUM";
      if (t < 12) return "PHASE 2: EXTERNAL STRESS";
      return "PHASE 3: LATTICE REORGANIZATION";
  }

  const getProgressWidth = () => {
      return Math.min(100, (displayTime / DURATION) * 100) + '%';
  }

  return (
    <div className="relative w-full h-screen bg-neutral-950 flex flex-col items-center justify-center font-mono">
        {/* Header / HUD */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
            <div>
                <h1 className="text-white text-2xl font-bold tracking-tight mb-1">VERLET <span className="text-neutral-500">ELASTICITY</span></h1>
                <div className="text-xs text-neutral-400">
                    <div>NODES: {simState.current.nodes.length}</div>
                    <div>EDGES: {simState.current.edges.length}</div>
                    <div>INTEGRATOR: VERLET (DT: {(TIME_STEP * 1000).toFixed(1)}ms)</div>
                </div>
            </div>
            <div className="text-right">
                <div className={`text-xl font-bold transition-colors duration-500 ${
                    displayTime < 6 ? 'text-emerald-400' : 
                    displayTime < 12 ? 'text-rose-500' : 'text-blue-400'
                }`}>
                    {getPhaseName()}
                </div>
                <div className="text-4xl text-white font-light tabular-nums mt-2">
                    {displayTime.toFixed(2)}<span className="text-lg text-neutral-500">s</span>
                </div>
            </div>
        </div>

        {/* Visualization Area */}
        <div ref={containerRef} className="w-full h-full relative">
             <canvas 
                ref={canvasRef} 
                className="block w-full h-full"
             />
        </div>

        {/* Timeline Bar */}
        <div className="absolute bottom-10 left-10 right-10 h-1 bg-neutral-800 rounded overflow-hidden z-10">
            <div 
                className="h-full bg-white transition-all duration-100 ease-linear" 
                style={{ width: getProgressWidth() }}
            />
        </div>

        {/* Controls */}
        <div className="absolute bottom-20 z-10">
            {isFinished && (
                <button 
                    onClick={handleRestart}
                    className="px-8 py-3 bg-white text-black font-bold tracking-widest hover:bg-neutral-200 transition active:scale-95"
                >
                    REPLAY SIMULATION
                </button>
            )}
        </div>
    </div>
  );
};

export default App;