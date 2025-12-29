import React, { useRef, useEffect } from 'react';
import { Particle, Cluster, Hotspot, SimulationState } from '../types';
import {
  DURATION_MS,
  PARTICLE_COUNT,
  CLUSTER_COUNT,
  CONNECTION_DISTANCE_SQ,
  MAX_CONNECTIONS,
  SPRING_K,
  FRICTION,
  NOISE_STRENGTH,
  COLOR_BG,
  COLOR_TEAL,
  COLOR_RED,
  COLOR_WHITE,
} from '../constants';
import { mulberry32, randomRange } from '../utils/rng';
import { distSq } from '../utils/math';

const EngineCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Entire simulation state held in ref to avoid React render cycles
  const simState = useRef<SimulationState>({
    particles: [],
    clusters: [],
    hotspots: [],
    width: 0,
    height: 0,
  });

  const frameIdRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Initialize Simulation Data
  const initSimulation = (width: number, height: number) => {
    const rng = mulberry32(12345); // Fixed seed for determinism
    const particles: Particle[] = [];
    const clusters: Cluster[] = [];
    const hotspots: Hotspot[] = [];

    // Create Clusters (Attractors)
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      clusters.push({
        x: randomRange(rng, width * 0.2, width * 0.8),
        y: randomRange(rng, height * 0.2, height * 0.8),
        targetX: randomRange(rng, width * 0.2, width * 0.8),
        targetY: randomRange(rng, height * 0.2, height * 0.8),
        color: i % 2 === 0 ? COLOR_TEAL : COLOR_WHITE,
      });
    }

    // Create Hotspots (Risk Zones)
    // We place them somewhat centrally but offset
    hotspots.push({
      x: width * 0.3,
      y: height * 0.3,
      radius: 150,
      color: COLOR_RED,
    });
    hotspots.push({
      x: width * 0.7,
      y: height * 0.7,
      radius: 180,
      color: COLOR_RED,
    });

    // Create Particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const clusterIdx = Math.floor(rng() * CLUSTER_COUNT);
      const cluster = clusters[clusterIdx];
      const offsetX = randomRange(rng, -50, 50);
      const offsetY = randomRange(rng, -50, 50);

      particles.push({
        id: i,
        x: cluster.x + offsetX,
        y: cluster.y + offsetY,
        vx: randomRange(rng, -1, 1),
        vy: randomRange(rng, -1, 1),
        baseX: cluster.x + offsetX,
        baseY: cluster.y + offsetY,
        clusterIndex: clusterIdx,
        color: rng() > 0.8 ? COLOR_TEAL : COLOR_WHITE,
        radius: randomRange(rng, 1.5, 3),
      });
    }

    simState.current = {
      particles,
      clusters,
      hotspots,
      width,
      height,
    };
  };

  const updatePhysics = (progress: number) => {
    const state = simState.current;
    // RNG for frame-based noise (re-seeded per frame conceptually, but we just use a running one here is fine 
    // OR strictly, we should use a noise function based on particle ID and time for true determinism. 
    // For visual noise, a simple rng call in loop is acceptable if frame-locked, but to be safe with React 18 
    // strict mode potential double invokes, we use a cheap pseudo-random based on ID + time).
    
    // 40% - 70% of cycle is "High Energy" (Noise Jitter)
    const isJitterPhase = progress > 0.4 && progress < 0.7;
    
    // Move clusters slowly in a circle or back and forth based on time
    state.clusters.forEach((c, i) => {
      const angle = (progress * Math.PI * 2) + (i * (Math.PI / 3));
      const radius = 50;
      // Oscillate cluster centers slightly
      c.x = c.targetX + Math.cos(angle) * radius;
      c.y = c.targetY + Math.sin(angle) * radius;
    });

    state.particles.forEach((p) => {
      const cluster = state.clusters[p.clusterIndex];

      // 1. Spring Force to Cluster Center
      const dx = cluster.x - p.x;
      const dy = cluster.y - p.y;
      
      p.vx += dx * SPRING_K;
      p.vy += dy * SPRING_K;

      // 2. Hotspot Repulsion (Risk Zones)
      state.hotspots.forEach(h => {
        const dist2 = distSq(p.x, p.y, h.x, h.y);
        const r2 = h.radius * h.radius;
        if (dist2 < r2) {
            // Push away
            const force = (r2 - dist2) / r2; // 0 to 1 strength
            const hdx = p.x - h.x;
            const hdy = p.y - h.y;
            p.vx += hdx * 0.005 * force;
            p.vy += hdy * 0.005 * force;
            
            // Temporary color shift near hotspot
            if (force > 0.5) {
                // We don't change state.color permanently to avoid complex state management
                // Just handled in draw logic usually, but here physics affects motion
            }
        }
      });

      // 3. Noise Jitter (in active phase)
      if (isJitterPhase) {
        // Pseudo-random based on ID and time
        const rx = Math.sin(p.id * 12.9898 + progress * 100) * NOISE_STRENGTH;
        const ry = Math.cos(p.id * 78.233 + progress * 100) * NOISE_STRENGTH;
        p.vx += rx;
        p.vy += ry;
      }

      // 4. Damping
      p.vx *= FRICTION;
      p.vy *= FRICTION;

      // 5. Update Position
      p.x += p.vx;
      p.y += p.vy;
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const state = simState.current;

    // 1. Trails: Draw semi-transparent background to create fade effect
    // We use a specific dark color with low alpha
    ctx.fillStyle = `rgba(2, 6, 23, 0.25)`; // slate-950 with alpha
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Hotspots (Glowy Backgrounds)
    state.hotspots.forEach(h => {
        const gradient = ctx.createRadialGradient(h.x, h.y, h.radius * 0.2, h.x, h.y, h.radius);
        gradient.addColorStop(0, 'rgba(248, 113, 113, 0.15)'); // Inner Red
        gradient.addColorStop(1, 'rgba(248, 113, 113, 0)'); // Outer Transparent
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. Draw Connections (Threads)
    // Batch path creation for performance
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.15)'; // Faint teal
    ctx.beginPath();

    const particles = state.particles;
    const pCount = particles.length;

    for (let i = 0; i < pCount; i++) {
        const p1 = particles[i];
        let connections = 0;
        
        // Optimization: Check only a subset or simple brute force 
        // given N=400, N^2/2 is ~80k checks. Fast enough for JS.
        for (let j = i + 1; j < pCount; j++) {
            if (connections >= MAX_CONNECTIONS) break;
            
            const p2 = particles[j];
            const d2 = distSq(p1.x, p1.y, p2.x, p2.y);
            
            if (d2 < CONNECTION_DISTANCE_SQ) {
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                connections++;
            }
        }
    }
    ctx.stroke();

    // 4. Draw Particles
    // Use glow for particles
    ctx.shadowBlur = 8;
    ctx.shadowColor = COLOR_TEAL;

    // Batch by color to minimize state changes
    // Group 1: Teal
    ctx.fillStyle = COLOR_TEAL;
    ctx.beginPath();
    for (let i = 0; i < pCount; i++) {
        const p = particles[i];
        // Check hotspot proximity for color override visually
        let isHot = false;
        for(const h of state.hotspots) {
            if (distSq(p.x, p.y, h.x, h.y) < (h.radius * h.radius * 0.4)) {
                isHot = true;
                break;
            }
        }

        if (!isHot && p.color === COLOR_TEAL) {
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
    }
    ctx.fill();

    // Group 2: White
    ctx.shadowColor = COLOR_WHITE;
    ctx.fillStyle = COLOR_WHITE;
    ctx.beginPath();
    for (let i = 0; i < pCount; i++) {
        const p = particles[i];
         // Check hotspot proximity
         let isHot = false;
         for(const h of state.hotspots) {
             if (distSq(p.x, p.y, h.x, h.y) < (h.radius * h.radius * 0.4)) {
                 isHot = true;
                 break;
             }
         }

        if (!isHot && p.color === COLOR_WHITE) {
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
    }
    ctx.fill();

    // Group 3: Hot (Red) override
    ctx.shadowColor = COLOR_RED;
    ctx.fillStyle = COLOR_RED;
    ctx.beginPath();
    for (let i = 0; i < pCount; i++) {
        const p = particles[i];
        let isHot = false;
         for(const h of state.hotspots) {
             if (distSq(p.x, p.y, h.x, h.y) < (h.radius * h.radius * 0.4)) {
                 isHot = true;
                 break;
             }
         }
        if (isHot) {
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.radius + 1, 0, Math.PI * 2); // Slightly larger
        }
    }
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const progress = (elapsed % DURATION_MS) / DURATION_MS; // 0.0 to 1.0

    updatePhysics(progress);
    draw(ctx, canvas.width, canvas.height, progress);

    frameIdRef.current = requestAnimationFrame(loop);
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            // Only re-init if dimensions actually change significantly to avoid flicker on mobile scroll
            if (Math.abs(clientWidth - simState.current.width) > 50 || Math.abs(clientHeight - simState.current.height) > 50) {
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                initSimulation(clientWidth, clientHeight);
            }
        }
    };

    // Initial Setup
    handleResize();

    // Observer for container resize
    const resizeObserver = new ResizeObserver(() => {
        handleResize();
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Start Animation Loop
  useEffect(() => {
    startTimeRef.current = performance.now();
    frameIdRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      {/* Overlay Information */}
      <div className="absolute top-4 left-4 pointer-events-none text-slate-500 font-mono text-xs">
        <div>NEURAL PULSE // 18s LOOP</div>
        <div className="mt-1 flex gap-2">
            <span className="text-teal-400">● CLUSTERS</span>
            <span className="text-red-400">● HOTSPOTS</span>
        </div>
      </div>
    </div>
  );
};

export default EngineCanvas;
