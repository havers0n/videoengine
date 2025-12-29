import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Particle, ClusterInfo, SimulationConfig, Point } from '../types';
import { Random } from '../utils/random';
import { getClusterColor } from '../utils/colors';

// --- Constants & Config ---
const INITIAL_SEED = 12345;
const DT = 1 / 120; // Fixed timestep
const CELL_SIZE = 80; // Spatial hash cell size
const MAX_HISTORY = 6;
const CONNECTION_OPACITY_BASE = 0.15;

const DEFAULT_CONFIG: SimulationConfig = {
  particleCount: 600,
  clusterCount: 8,
  connectionDistance: 70,
  viscosity: 0.96, // Damping factor
  drag: 0.02,
  clusterStrength: 0.05, // Pull towards same cluster neighbors
  repulsionStrength: 0.12, // Push away from different cluster
};

interface SpatialGrid {
  [key: string]: number[]; // "x|y" -> [particleIndex, particleIndex...]
}

export const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // State for UI stats (optional)
  const [fps, setFps] = useState(0);

  // We use a ref for the entire simulation state to avoid React re-renders in the loop
  // and to ensure the closure inside requestAnimationFrame always has access to fresh data.
  const stateRef = useRef<{
    particles: Particle[];
    grid: SpatialGrid;
    clusters: ClusterInfo[];
    width: number;
    height: number;
    rng: Random;
    mouseX: number;
    mouseY: number;
    isMouseDown: boolean;
    accumulator: number;
    lastTime: number;
    frameCount: number;
    lastFpsTime: number;
  }>({
    particles: [],
    grid: {},
    clusters: [],
    width: 0,
    height: 0,
    rng: new Random(INITIAL_SEED),
    mouseX: -1000,
    mouseY: -1000,
    isMouseDown: false,
    accumulator: 0,
    lastTime: 0,
    frameCount: 0,
    lastFpsTime: 0,
  });

  // --- Initialization ---
  const initSimulation = useCallback((width: number, height: number) => {
    const state = stateRef.current;
    state.width = width;
    state.height = height;
    state.rng = new Random(INITIAL_SEED);
    state.particles = [];
    state.clusters = [];

    // Create Clusters
    for (let i = 0; i < DEFAULT_CONFIG.clusterCount; i++) {
      state.clusters.push({
        id: i,
        color: getClusterColor(i),
      });
    }

    // Create Particles
    for (let i = 0; i < DEFAULT_CONFIG.particleCount; i++) {
      state.particles.push({
        id: i,
        x: state.rng.range(0, width),
        y: state.rng.range(0, height),
        vx: state.rng.range(-1, 1),
        vy: state.rng.range(-1, 1),
        clusterId: state.rng.rangeInt(0, DEFAULT_CONFIG.clusterCount),
        history: [],
      });
    }
  }, []);

  // --- Spatial Hash Logic ---
  const getGridKey = (x: number, y: number): string => {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    return `${col}|${row}`;
  };

  const updateGrid = () => {
    const state = stateRef.current;
    state.grid = {};
    const { particles, grid } = state;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Keep strictly within bounds for grid hashing
      const key = getGridKey(Math.max(0, p.x), Math.max(0, p.y));
      if (!grid[key]) {
        grid[key] = [];
      }
      grid[key].push(i);
    }
  };

  const getNearbyParticleIndices = (p: Particle): number[] => {
    const state = stateRef.current;
    const col = Math.floor(p.x / CELL_SIZE);
    const row = Math.floor(p.y / CELL_SIZE);
    const indices: number[] = [];

    // Check 3x3 neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${col + dx}|${row + dy}`;
        if (state.grid[key]) {
          indices.push(...state.grid[key]);
        }
      }
    }
    return indices;
  };

  // --- Physics Update ---
  const updatePhysics = (dt: number) => {
    const state = stateRef.current;
    const { particles, width, height, mouseX, mouseY, isMouseDown } = state;
    
    // Rebuild grid for current positions
    updateGrid();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // 1. Interaction with Neighbors
      const neighbors = getNearbyParticleIndices(p);
      let fx = 0;
      let fy = 0;

      for (const ni of neighbors) {
        if (ni === i) continue; // Skip self
        const other = particles[ni];

        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0 && distSq < DEFAULT_CONFIG.connectionDistance * DEFAULT_CONFIG.connectionDistance) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / DEFAULT_CONFIG.connectionDistance);

            if (other.clusterId === p.clusterId) {
                // Attraction (Cohesion)
                fx += dx * force * DEFAULT_CONFIG.clusterStrength;
                fy += dy * force * DEFAULT_CONFIG.clusterStrength;
            } else {
                // Repulsion (Separation) - Stronger but shorter range effective
                fx -= dx * force * DEFAULT_CONFIG.repulsionStrength;
                fy -= dy * force * DEFAULT_CONFIG.repulsionStrength;
            }
        }
      }

      // 2. Mouse Interaction (Hotspot)
      const mDx = mouseX - p.x;
      const mDy = mouseY - p.y;
      const mDistSq = mDx * mDx + mDy * mDy;
      if (mDistSq < 40000) { // 200px radius
         const mDist = Math.sqrt(mDistSq);
         const mForce = (1 - mDist / 200) * 0.5;
         
         if (isMouseDown) {
             // Scatter
             fx -= mDx * mForce * 10;
             fy -= mDy * mForce * 10;
         } else {
             // Gentle pull
             fx += mDx * mForce * 0.5;
             fy += mDy * mForce * 0.5;
         }
      }

      // 3. Integration
      p.vx = (p.vx + fx) * DEFAULT_CONFIG.viscosity;
      p.vy = (p.vy + fy) * DEFAULT_CONFIG.viscosity;
      
      p.x += p.vx * dt * 60; // Scale by 60 to normalize speed relative to 60fps base
      p.y += p.vy * dt * 60;

      // 4. Boundary Constraint (Bounce)
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > height) { p.y = height; p.vy *= -1; }

      // 5. History (Trails)
      // Only add to history every few frames or if distance moved is significant to save perf
      // Here we just shift every frame for smoothness
      p.history.unshift({ x: p.x, y: p.y });
      if (p.history.length > MAX_HISTORY) {
        p.history.pop();
      }
    }
  };

  // --- Rendering ---
  const render = (ctx: CanvasRenderingContext2D, alpha: number) => {
    const state = stateRef.current;
    const { particles, width, height, clusters } = state;

    ctx.clearRect(0, 0, width, height);
    
    // Background slightly darker than clear to ensure trails look good? 
    // Actually standard clear is better for sharp rendering in this specific art style.

    // 1. Draw Connections (Threads)
    // To optimize, we only check neighbors from the spatial hash.
    // However, since we already iterated for physics, doing it again for render is O(N * neighbors).
    // This is acceptable for ~800 particles.
    
    ctx.lineWidth = 0.5;
    
    // We can't batch beginPath easily because colors differ per cluster pair.
    // To optimize: Batch lines by cluster ID? Too complex.
    // Simple approach: Iterate.

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const neighbors = getNearbyParticleIndices(p);
        
        for (const ni of neighbors) {
            if (ni <= i) continue; // Draw unique pairs only
            const other = particles[ni];
            
            // Only draw same-cluster connections for "threads" look
            if (p.clusterId === other.clusterId) {
                 const dx = other.x - p.x;
                 const dy = other.y - p.y;
                 const distSq = dx * dx + dy * dy;
                 
                 // Draw line if close
                 if (distSq < DEFAULT_CONFIG.connectionDistance * DEFAULT_CONFIG.connectionDistance) {
                     const dist = Math.sqrt(distSq);
                     const opacity = (1 - dist / DEFAULT_CONFIG.connectionDistance) * CONNECTION_OPACITY_BASE;
                     
                     ctx.beginPath();
                     ctx.strokeStyle = clusters[p.clusterId].color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                     ctx.moveTo(p.x, p.y);
                     ctx.lineTo(other.x, other.y);
                     ctx.stroke();
                 }
            }
        }
    }

    // 2. Draw Particles & Trails
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const color = clusters[p.clusterId].color;

        // Trail
        if (p.history.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            // Lower opacity for trail
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1;
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let j = 1; j < p.history.length; j++) {
                ctx.lineTo(p.history[j].x, p.history[j].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Body
        ctx.fillStyle = color;
        
        // Simple glow effect via shadow (can be expensive, use sparingly or batch)
        // Since we want performance, we might skip true shadowBlur for all and simulate with a larger arc
        // Or toggle it based on count. For 600 particles, shadowBlur is risky on low-end.
        // Let's do a simple circle.
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Mouse Interaction Visual
    if (state.mouseX > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.arc(state.mouseX, state.mouseY, 200, 0, Math.PI * 2);
        ctx.stroke();
    }
  };

  // --- Main Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false for slight perf boost if background is opaque
    if (!ctx) return;

    // Initial sizing
    const handleResize = () => {
        if (!wrapperRef.current || !canvasRef.current) return;
        const { clientWidth, clientHeight } = wrapperRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        // Re-init simulation if size changes drastically? 
        // Or just update bounds. Updating bounds is better.
        stateRef.current.width = clientWidth;
        stateRef.current.height = clientHeight;
        
        // If it's the first run (empty), init
        if (stateRef.current.particles.length === 0) {
            initSimulation(clientWidth, clientHeight);
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let animationFrameId: number;
    
    const loop = (timestamp: number) => {
        const state = stateRef.current;
        
        // Initial setup for time
        if (!state.lastTime) state.lastTime = timestamp;
        
        const frameTime = Math.min((timestamp - state.lastTime) / 1000, 0.25); // Cap at 0.25s
        state.lastTime = timestamp;
        
        state.accumulator += frameTime;
        
        // Fixed Timestep Update
        while (state.accumulator >= DT) {
            updatePhysics(DT);
            state.accumulator -= DT;
        }
        
        // Render
        // We pass alpha for interpolation if we wanted to implement it (state.accumulator / DT)
        // For this simulation style, direct position is usually fine without complex interpolation
        render(ctx, state.accumulator / DT);
        
        // FPS Counter logic
        state.frameCount++;
        if (timestamp - state.lastFpsTime >= 1000) {
            setFps(state.frameCount);
            state.frameCount = 0;
            state.lastFpsTime = timestamp;
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
    };
  }, [initSimulation]);

  // --- Event Handlers ---
  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
          stateRef.current.mouseX = e.clientX - rect.left;
          stateRef.current.mouseY = e.clientY - rect.top;
      }
  };

  const handleMouseDown = () => {
      stateRef.current.isMouseDown = true;
  };

  const handleMouseUp = () => {
      stateRef.current.isMouseDown = false;
  };
  
  const handleMouseLeave = () => {
      stateRef.current.mouseX = -1000;
      stateRef.current.mouseY = -1000;
      stateRef.current.isMouseDown = false;
  };

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-neutral-950">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-lg border border-white/10 text-white/80">
          <h1 className="text-xl font-bold text-white mb-2">Cluster Dynamics</h1>
          <div className="text-xs space-y-1 font-mono">
            <p><span className="text-neutral-400">FPS:</span> {fps}</p>
            <p><span className="text-neutral-400">Particles:</span> {DEFAULT_CONFIG.particleCount}</p>
            <p><span className="text-neutral-400">Clusters:</span> {DEFAULT_CONFIG.clusterCount}</p>
            <p><span className="text-neutral-400">Time Step:</span> {(DT * 1000).toFixed(2)}ms</p>
          </div>
          <div className="mt-4 text-xs text-neutral-500">
            <p>Hover to attract</p>
            <p>Click to scatter</p>
          </div>
        </div>
      </div>
    </div>
  );
};
