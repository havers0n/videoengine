import React, { useRef, useEffect, useCallback, useState } from 'react';
import { SeededRNG, Particle, SimulationConfig, HSLToHex, GRID_CELL_SIZE } from '../utils';

const CONFIG: SimulationConfig = {
  particleCount: 500,
  clusterCount: 8,
  connectionDistance: 70, // Needs to be <= GRID_CELL_SIZE usually for simple neighbor checks
  mouseRepelRadius: 150,
  mouseRepelForce: 200,
  friction: 0.96, // High friction for organic feel
  speed: 100, // Speed multiplier
};

const SEED = 123456;
const DT = 1 / 120; // Fixed timestep
const TRAIL_LENGTH = 8;

const Simulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stats for nerds (hidden logic, but good for debug)
  const statsRef = useRef({ fps: 0, particleCount: CONFIG.particleCount });
  const [debugInfo, setDebugInfo] = useState("");

  // Refs for simulation state (NO setState in loop)
  const particlesRef = useRef<Particle[]>([]);
  const gridRef = useRef<Map<number, number[]>>(new Map()); // Spatial Hash: Index -> Particle Indices
  const mouseRef = useRef({ x: -1000, y: -1000, isDown: false });
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0); // Last frame time
  const accumulatorRef = useRef<number>(0);
  
  // Cluster centers (hotspots) - they move slowly
  const clustersRef = useRef<{x: number, y: number, dx: number, dy: number, color: string}[]>([]);

  // Initialize Simulation
  const init = useCallback((width: number, height: number) => {
    const rng = new SeededRNG(SEED);
    const particles: Particle[] = [];
    const clusters = [];

    // Create moving cluster centers
    for (let i = 0; i < CONFIG.clusterCount; i++) {
      clusters.push({
        x: rng.nextRange(width * 0.1, width * 0.9),
        y: rng.nextRange(height * 0.1, height * 0.9),
        dx: rng.nextRange(-20, 20),
        dy: rng.nextRange(-20, 20),
        color: HSLToHex((i * 360 / CONFIG.clusterCount), 80, 60)
      });
    }
    clustersRef.current = clusters;

    // Create Particles
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const clusterId = Math.floor(rng.nextRange(0, CONFIG.clusterCount));
      const center = clusters[clusterId];
      
      // Spawn near cluster center initially
      const angle = rng.nextRange(0, Math.PI * 2);
      const dist = rng.nextRange(0, 100);

      particles.push({
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        vx: rng.nextRange(-10, 10),
        vy: rng.nextRange(-10, 10),
        radius: rng.nextRange(1.5, 3),
        cluster: clusterId,
        color: center.color,
        history: []
      });
    }
    particlesRef.current = particles;
  }, []);

  // Spatial Grid Helpers
  const getGridIndex = (x: number, y: number, cols: number) => {
    const col = Math.floor(x / GRID_CELL_SIZE);
    const row = Math.floor(y / GRID_CELL_SIZE);
    return row * cols + col;
  };

  const updateGrid = (width: number, height: number) => {
    const cols = Math.ceil(width / GRID_CELL_SIZE);
    gridRef.current.clear();
    
    particlesRef.current.forEach((p, index) => {
      // Boundary check clamp for grid insertion to avoid out of bounds keys
      const safeX = Math.max(0, Math.min(width - 1, p.x));
      const safeY = Math.max(0, Math.min(height - 1, p.y));
      
      const key = getGridIndex(safeX, safeY, cols);
      if (!gridRef.current.has(key)) {
        gridRef.current.set(key, []);
      }
      gridRef.current.get(key)!.push(index);
    });
  };

  // Physics Step
  const update = (dt: number, width: number, height: number) => {
    const particles = particlesRef.current;
    const clusters = clustersRef.current;
    const cols = Math.ceil(width / GRID_CELL_SIZE);
    const rows = Math.ceil(height / GRID_CELL_SIZE);
    const mouse = mouseRef.current;

    // Update Clusters (Drift)
    clusters.forEach(c => {
      c.x += c.dx * dt;
      c.y += c.dy * dt;
      if (c.x < 0 || c.x > width) c.dx *= -1;
      if (c.y < 0 || c.y > height) c.dy *= -1;
    });

    // Rebuild Spatial Hash
    updateGrid(width, height);

    const grid = gridRef.current;
    
    // Physics Loop
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // 1. Cluster forces (Attraction to own cluster center)
      const clusterCenter = clusters[p.cluster];
      const dxC = clusterCenter.x - p.x;
      const dyC = clusterCenter.y - p.y;
      const distC = Math.sqrt(dxC * dxC + dyC * dyC);
      
      if (distC > 0) {
        // Simple harmonic motion-ish pull
        const force = 150; 
        p.vx += (dxC / distC) * force * dt;
        p.vy += (dyC / distC) * force * dt;
      }

      // 2. Local Interactions (Spatial Hash)
      const col = Math.floor(p.x / GRID_CELL_SIZE);
      const row = Math.floor(p.y / GRID_CELL_SIZE);

      // Check 3x3 neighbor grid cells
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          const neighborCol = col + x;
          const neighborRow = row + y;
          
          if (neighborCol >= 0 && neighborCol < cols && neighborRow >= 0 && neighborRow < rows) {
             const key = neighborRow * cols + neighborCol;
             const neighbors = grid.get(key);
             
             if (neighbors) {
               for (const nj of neighbors) {
                 if (nj === i) continue; // Skip self
                 const other = particles[nj];
                 
                 const dx = other.x - p.x;
                 const dy = other.y - p.y;
                 const distSq = dx*dx + dy*dy;
                 
                 // Inter-particle forces
                 const minDist = 30;
                 const minDistSq = minDist * minDist;

                 // Repulsion (Separation)
                 if (distSq < minDistSq && distSq > 0.1) {
                    const dist = Math.sqrt(distSq);
                    const force = 1000 * (1 - dist/minDist); // Strong close range repulsion
                    p.vx -= (dx / dist) * force * dt;
                    p.vy -= (dy / dist) * force * dt;
                 }

                 // Cluster-based Logic
                 // If same cluster, weak attraction (Cohesion)
                 // If diff cluster, extra repulsion
                 if (distSq < 10000) { // Interaction range
                    if (p.cluster === other.cluster) {
                        p.vx += dx * 0.5 * dt;
                        p.vy += dy * 0.5 * dt;
                    } else {
                        // Keep clusters distinct
                        p.vx -= dx * 1.5 * dt;
                        p.vy -= dy * 1.5 * dt;
                    }
                 }
               }
             }
          }
        }
      }

      // 3. Mouse Interaction
      const dxM = mouse.x - p.x;
      const dyM = mouse.y - p.y;
      const distMSq = dxM * dxM + dyM * dyM;
      const repelRadSq = CONFIG.mouseRepelRadius * CONFIG.mouseRepelRadius;
      
      if (distMSq < repelRadSq) {
        const distM = Math.sqrt(distMSq);
        const force = mouse.isDown ? -CONFIG.mouseRepelForce * 3 : CONFIG.mouseRepelForce; // Click to attract, hover to repel (or vice versa)
        // Let's make hover = repel, click = super repel
        const dir = mouse.isDown ? 5 : 1;
        const f = (1 - distM / CONFIG.mouseRepelRadius) * force * dir;
        
        p.vx -= (dxM / distM) * f * dt;
        p.vy -= (dyM / distM) * f * dt;
      }

      // 4. Integration & Friction
      p.vx *= CONFIG.friction;
      p.vy *= CONFIG.friction;
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 5. Walls (Bounce)
      const margin = p.radius;
      if (p.x < margin) { p.x = margin; p.vx *= -1; }
      if (p.x > width - margin) { p.x = width - margin; p.vx *= -1; }
      if (p.y < margin) { p.y = margin; p.vy *= -1; }
      if (p.y > height - margin) { p.y = height - margin; p.vy *= -1; }

      // 6. History (Trails) - Update roughly every frame, or throttle
      // Using a simple unshift/pop is O(N), for small N it's fine.
      // Optimization: Only push if moved significantly? No, smooth trails needed.
      p.history.unshift({x: p.x, y: p.y});
      if (p.history.length > TRAIL_LENGTH) {
        p.history.pop();
      }
    }
  };

  // Render Step
  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. Fade effect for trails (alternative to history array, but requested specific trail feature)
    // We combine both: Fade clears the screen smoothly, history array draws specific lines.
    // For performance + aesthetics: Standard clearRect + History Lines looks cleaner than alpha trails.
    // But "ShadowBlur" + "Trails" suggests a neon look.
    
    // Clear with very slight opacity for "afterimage" trail effect if desired, 
    // but we use explicit trail geometry for sharpness.
    ctx.fillStyle = 'rgba(5, 5, 5, 1)'; // Solid clear for crisp logic
    ctx.fillRect(0, 0, width, height);
    
    const particles = particlesRef.current;
    const grid = gridRef.current;
    const cols = Math.ceil(width / GRID_CELL_SIZE);

    // BATCH DRAWING: Connections first
    ctx.lineWidth = 1;
    
    // To avoid drawing duplicates, we iterate grid cells and only check neighbors in positive directions? 
    // Or just draw all and accept double draw (easy but 2x cost).
    // Better: Iterate particles, only check neighbors in "forward" grid cells or reuse neighbor logic.
    // Simpler: Just iterate particles and check neighbors.
    
    particles.forEach((p, i) => {
      // Find neighbors for connections
      const col = Math.floor(p.x / GRID_CELL_SIZE);
      const row = Math.floor(p.y / GRID_CELL_SIZE);
      
      // Optimization: Only check current cell and adjacent cells
      // We only draw lines to particles with index > i to avoid duplicates
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
           const k = (row + y) * cols + (col + x);
           const cell = grid.get(k);
           if (!cell) continue;
           
           for (const idx of cell) {
             if (idx <= i) continue; // Avoid duplicate lines and self
             const other = particles[idx];
             
             // Check connection distance
             const dx = p.x - other.x;
             const dy = p.y - other.y;
             const distSq = dx*dx + dy*dy;
             const connectDistSq = CONFIG.connectionDistance * CONFIG.connectionDistance;
             
             if (distSq < connectDistSq) {
               // Only connect same cluster or very close neighbors
               if (p.cluster === other.cluster) {
                  const dist = Math.sqrt(distSq);
                  const alpha = 1 - dist / CONFIG.connectionDistance;
                  ctx.strokeStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2,'0')}`; // fast hex alpha
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                  ctx.lineTo(other.x, other.y);
                  ctx.stroke();
               }
             }
           }
        }
      }
    });

    // BATCH DRAWING: Trails
    ctx.lineCap = 'round';
    particles.forEach(p => {
        if (p.history.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.radius * 0.5;
        // Draw trail
        for (let j = 0; j < p.history.length - 1; j++) {
            const p1 = p.history[j];
            const p2 = p.history[j+1];
            ctx.globalAlpha = (TRAIL_LENGTH - j) / TRAIL_LENGTH * 0.5;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    });

    // BATCH DRAWING: Particles (with ShadowBlur for Hotspots feel)
    // Group by color to minimize state changes? 
    // Optimization: Just draw.
    
    // Enable glow only for particles (expensive)
    ctx.shadowBlur = 15;
    
    particles.forEach(p => {
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.shadowBlur = 0; // Reset
  };

  const loop = (timestamp: number) => {
    if (!timeRef.current) timeRef.current = timestamp;
    const deltaTime = (timestamp - timeRef.current) / 1000;
    timeRef.current = timestamp;

    // Accumulator for fixed timestep
    // Cap deltaTime to avoid spiral of death if tab was inactive
    accumulatorRef.current += Math.min(deltaTime, 0.25);

    const canvas = canvasRef.current;
    if (canvas && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Resize check
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            // Re-init if drastic change? Or just let them float back.
            // Let's just update bounds.
        }

        while (accumulatorRef.current >= DT) {
            update(DT, width, height);
            accumulatorRef.current -= DT;
        }

        const ctx = canvas.getContext('2d', { alpha: false }); // optimization
        if (ctx) {
            draw(ctx, width, height);
        }
    }

    animationRef.current = requestAnimationFrame(loop);
    
    // Debug info update (throttled)
    if (Math.random() < 0.05) {
        setDebugInfo(`${Math.round(1/deltaTime)} FPS | ${CONFIG.particleCount} Particles | ${CONFIG.clusterCount} Clusters`);
    }
  };

  useEffect(() => {
    if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        init(clientWidth, clientHeight);
    }
    
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [init]);

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
      mouseRef.current.x = -9999; 
      mouseRef.current.y = -9999; 
      mouseRef.current.isDown = false;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        className="block"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <div className="absolute top-4 right-4 text-right font-mono text-[10px] text-neutral-600 pointer-events-none select-none">
        {debugInfo}
      </div>
    </div>
  );
};

export default Simulation;