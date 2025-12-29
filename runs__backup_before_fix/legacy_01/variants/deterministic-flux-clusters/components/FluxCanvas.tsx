import React, { useRef, useEffect, useState } from 'react';
import { DeterministicRandom } from '../utils/deterministic';
import { Particle, Cluster, Vector2 } from '../types';

// Palette for clusters
const PALETTE = [
  '#00f0ff', // Cyan
  '#ff0055', // Magenta
  '#00ff99', // Spring Green
  '#ffee00', // Yellow
  '#aa00ff', // Violet
  '#ff5500', // Orange
];

export const FluxCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  
  // Simulation State stored in Refs to avoid React render cycle overhead
  const stateRef = useRef<{
    particles: Particle[];
    clusters: Cluster[];
    rng: DeterministicRandom;
    width: number;
    height: number;
    time: number;
    hotspots: Vector2[];
  }>({
    particles: [],
    clusters: [],
    rng: new DeterministicRandom(12345),
    width: 0,
    height: 0,
    time: 0,
    hotspots: [],
  });

  const [fps, setFps] = useState(0);

  // Constants
  const CLUSTER_COUNT = 6;
  const PARTICLE_COUNT = 240; // Kept reasonable for thread checks
  const CONNECTION_DIST = 80;
  const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
  const MAX_VELOCITY = 3.5;
  const DAMPING = 0.94;
  const SPRING_STRENGTH = 0.008;
  const HOTSPOT_FORCE = 0.05;

  // Initialize Simulation
  const initSimulation = (width: number, height: number) => {
    const state = stateRef.current;
    state.width = width;
    state.height = height;
    state.rng = new DeterministicRandom(999); // Fixed seed for reproducibility
    state.time = 0;

    // Create Clusters
    state.clusters = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const clusterRadius = Math.min(width, height) * 0.3;

    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const angle = (i / CLUSTER_COUNT) * Math.PI * 2;
      state.clusters.push({
        center: {
          x: centerX + Math.cos(angle) * clusterRadius,
          y: centerY + Math.sin(angle) * clusterRadius,
        },
        targetHue: i * (360 / CLUSTER_COUNT),
        angle: angle,
        radius: clusterRadius,
      });
    }

    // Create Hotspots (Static Attractors/Repulsors)
    state.hotspots = [
      { x: width * 0.2, y: height * 0.2 },
      { x: width * 0.8, y: height * 0.8 },
      { x: width * 0.5, y: height * 0.5 },
    ];

    // Create Particles
    state.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const clusterIdx = i % CLUSTER_COUNT;
      const cluster = state.clusters[clusterIdx];
      
      // Spawn near cluster center with some randomness
      const r = state.rng.range(0, 50);
      const theta = state.rng.range(0, Math.PI * 2);

      state.particles.push({
        id: i,
        pos: {
          x: cluster.center.x + Math.cos(theta) * r,
          y: cluster.center.y + Math.sin(theta) * r,
        },
        vel: { x: state.rng.range(-1, 1), y: state.rng.range(-1, 1) },
        acc: { x: 0, y: 0 },
        radius: state.rng.range(1.5, 3),
        color: PALETTE[clusterIdx],
        clusterIndex: clusterIdx,
        mass: state.rng.range(0.8, 1.5),
      });
    }
  };

  const updatePhysics = (dt: number) => {
    const state = stateRef.current;
    const { particles, clusters, hotspots, width, height } = state;
    
    // Slow drift of clusters
    const timeScale = state.time * 0.0005;
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      // Deterministic movement using sine/cos based on time
      const angle = c.angle + timeScale;
      // Slight oscillation in radius
      const r = c.radius + Math.sin(timeScale * 2 + i) * 50; 
      
      c.center.x = (width / 2) + Math.cos(angle) * r;
      c.center.y = (height / 2) + Math.sin(angle) * r;
    }

    // Dynamic hotspot movement
    hotspots[0].x = width * 0.2 + Math.cos(timeScale * 2) * 100;
    hotspots[0].y = height * 0.2 + Math.sin(timeScale * 3) * 100;
    hotspots[1].x = width * 0.8 + Math.sin(timeScale * 1.5) * 100;
    hotspots[1].y = height * 0.8 + Math.cos(timeScale * 2.5) * 100;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const cluster = clusters[p.clusterIndex];

      // 1. Spring force towards cluster center
      const dx = cluster.center.x - p.pos.x;
      const dy = cluster.center.y - p.pos.y;
      
      p.acc.x += dx * SPRING_STRENGTH;
      p.acc.y += dy * SPRING_STRENGTH;

      // 2. Interaction with Hotspots (Attraction/Repulsion based on index)
      // First hotspot attracts, second repels, etc.
      for(let h = 0; h < hotspots.length; h++) {
          const hx = hotspots[h].x - p.pos.x;
          const hy = hotspots[h].y - p.pos.y;
          const distSq = hx*hx + hy*hy;
          
          if (distSq < 40000 && distSq > 100) { // Range check
              const dist = Math.sqrt(distSq);
              const force = (HOTSPOT_FORCE * 1000) / distSq;
              const dirX = hx / dist;
              const dirY = hy / dist;

              // Alternating attraction/repulsion for complex flow
              const sign = h % 2 === 0 ? 1 : -1; 
              p.acc.x += dirX * force * sign;
              p.acc.y += dirY * force * sign;
          }
      }

      // 3. Separation force (simple n-body approximation or just random noise to prevent stacking)
      // To keep it strictly deterministic and performant without quadtree, we skip full n-body separation
      // and rely on cluster movement and random initial velocities. 
      // However, we can add a "noise" force based on position to simulate turbulence.
      const noiseX = Math.sin(p.pos.y * 0.01 + state.time * 0.001);
      const noiseY = Math.cos(p.pos.x * 0.01 + state.time * 0.001);
      p.acc.x += noiseX * 0.02;
      p.acc.y += noiseY * 0.02;

      // Integrate Physics
      p.vel.x += p.acc.x;
      p.vel.y += p.acc.y;

      // Damping (Friction)
      p.vel.x *= DAMPING;
      p.vel.y *= DAMPING;

      // Velocity Clamp
      const speedSq = p.vel.x * p.vel.x + p.vel.y * p.vel.y;
      if (speedSq > MAX_VELOCITY * MAX_VELOCITY) {
        const speed = Math.sqrt(speedSq);
        const scale = MAX_VELOCITY / speed;
        p.vel.x *= scale;
        p.vel.y *= scale;
      }

      // Update Position
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      // Wall constrain (bounce)
      if (p.pos.x < 0) { p.pos.x = 0; p.vel.x *= -1; }
      if (p.pos.x > width) { p.pos.x = width; p.vel.x *= -1; }
      if (p.pos.y < 0) { p.pos.y = 0; p.vel.y *= -1; }
      if (p.pos.y > height) { p.pos.y = height; p.vel.y *= -1; }

      // Reset accel
      p.acc.x = 0;
      p.acc.y = 0;
    }

    state.time += dt;
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    const { width, height, particles, hotspots } = state;

    // 1. Trails Alpha (Fade effect)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Low alpha for trails
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Hotspots (Gradients)
    hotspots.forEach((h, i) => {
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 150);
        const color = i % 2 === 0 ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255, 0, 100, 0.05)';
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 150, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. Draw Threads (Connections) & Particles
    // We do a nested loop, but optimize by checking indices to avoid double checking pairs
    // Only connect particles within the same cluster or very close neighbors
    
    ctx.lineWidth = 0.5;
    
    // Batch drawing to minimize state changes
    // It's faster to draw all lines, then all dots usually, or group by color.
    // Here we iterate to find lines first.
    
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        // Connect to neighbors
        // Optimization: check only next X particles to save CPU, 
        // effectively checking a "window" of the array which is spatially coherent 
        // only if sorted, but here it adds random connections which looks cool and "threaded".
        // Better: Check all particles in same cluster.
        
        // Intra-cluster threads (High probability)
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            
            // Optimization: Skip if clusters are too far apart (heuristic based on index)
            // But for visual correctness we do distance check.
            const dx = p1.pos.x - p2.pos.x;
            const dy = p1.pos.y - p2.pos.y;
            
            // Fast distance check (AABB)
            if (Math.abs(dx) > CONNECTION_DIST || Math.abs(dy) > CONNECTION_DIST) continue;

            const distSq = dx * dx + dy * dy;
            if (distSq < CONNECTION_DIST_SQ) {
                const alpha = 1 - (distSq / CONNECTION_DIST_SQ);
                
                ctx.strokeStyle = p1.clusterIndex === p2.clusterIndex 
                    ? p1.color.replace(')', `, ${alpha * 0.4})`).replace('rgb', 'rgba')
                    : `rgba(255, 255, 255, ${alpha * 0.1})`; // Inter-cluster is weak white
                
                ctx.beginPath();
                ctx.moveTo(p1.pos.x, p1.pos.y);
                ctx.lineTo(p2.pos.x, p2.pos.y);
                ctx.stroke();
            }
        }
    }

    // Draw Particles
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow for next operations if needed (though we loop same style)
    }
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
    if (!ctx) return;

    // Resize Handler
    const handleResize = () => {
      const { clientWidth, clientHeight } = container;
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      initSimulation(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = lastTime;

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      updatePhysics(dt);
      draw(ctx);

      // FPS Counter
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsTime = now;
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
       <div className="absolute top-4 right-4 text-xs font-mono text-gray-500 z-10">
        FPS: {fps}
      </div>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};