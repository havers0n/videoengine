import React, { useRef, useEffect } from 'react';
import { CONFIG } from '../constants';
import RNG from '../utils/rng';
import { SimState, Particle, Cluster, Hotspot } from '../types';

const EngineCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // StateRef Architecture: 
  // We hold the entire simulation state in a useRef to avoid React re-renders during the 60fps loop.
  const stateRef = useRef<SimState>({
    particles: [],
    clusters: [],
    hotspots: [],
    width: 0,
    height: 0,
  });

  const requestRef = useRef<number>(0);
  const rng = new RNG(12345); // Fixed seed for deterministic start

  // Initialize Simulation State
  const initSimulation = (width: number, height: number) => {
    stateRef.current.width = width;
    stateRef.current.height = height;
    stateRef.current.particles = [];
    stateRef.current.clusters = [];
    stateRef.current.hotspots = [];

    // Create Clusters
    for (let i = 0; i < CONFIG.CLUSTER_COUNT; i++) {
      stateRef.current.clusters.push({
        id: i,
        x: rng.range(width * 0.1, width * 0.9),
        y: rng.range(height * 0.1, height * 0.9),
        driftAngle: rng.range(0, Math.PI * 2),
      });
    }

    // Create Hotspots (Risk Zones)
    for (let i = 0; i < CONFIG.HOTSPOT_COUNT; i++) {
      stateRef.current.hotspots.push({
        x: rng.range(width * 0.2, width * 0.8),
        y: rng.range(height * 0.2, height * 0.8),
        radius: rng.range(100, 250),
        intensity: 0,
      });
    }

    // Create Particles
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      const clusterIdx = Math.floor(rng.next() * CONFIG.CLUSTER_COUNT);
      const cluster = stateRef.current.clusters[clusterIdx];
      
      stateRef.current.particles.push({
        x: cluster.x + rng.range(-50, 50),
        y: cluster.y + rng.range(-50, 50),
        vx: rng.range(-1, 1),
        vy: rng.range(-1, 1),
        clusterIndex: clusterIdx,
        isHot: false, // Will be calculated dynamically
      });
    }
  };

  const updatePhysics = (timestamp: number) => {
    const state = stateRef.current;
    const { width, height, particles, clusters, hotspots } = state;
    
    // Normalized Time (0 to 1) over 18s loop
    const t = (timestamp % CONFIG.LOOP_DURATION_MS) / CONFIG.LOOP_DURATION_MS;
    
    // Calculate Phase Intensity (Hotspots active 40-70%)
    // Smooth step function for transition
    let phaseIntensity = 0;
    if (t > CONFIG.RISK_PHASE_START && t < CONFIG.RISK_PHASE_END) {
      // Peak at middle of phase
      const phaseDuration = CONFIG.RISK_PHASE_END - CONFIG.RISK_PHASE_START;
      const relativeT = (t - CONFIG.RISK_PHASE_START) / phaseDuration;
      phaseIntensity = Math.sin(relativeT * Math.PI); // 0 -> 1 -> 0
    }

    // Update Hotspots
    hotspots.forEach((h, i) => {
      // Slight movement
      h.x += Math.sin(t * Math.PI * 4 + i) * 0.5;
      h.y += Math.cos(t * Math.PI * 4 + i) * 0.5;
      h.intensity = phaseIntensity;
    });

    // Update Clusters (Slow Drift)
    clusters.forEach((c) => {
      c.x += Math.cos(c.driftAngle + t * Math.PI * 2) * 0.3;
      c.y += Math.sin(c.driftAngle + t * Math.PI * 2) * 0.3;
      
      // Keep inside bounds
      if (c.x < 0) c.x += width;
      if (c.x > width) c.x -= width;
      if (c.y < 0) c.y += height;
      if (c.y > height) c.y -= height;
    });

    // Update Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const cluster = clusters[p.clusterIndex];

      // 1. Spring Force towards Cluster Center
      const dx = cluster.x - p.x;
      const dy = cluster.y - p.y;
      
      p.vx += dx * CONFIG.SPRING_STRENGTH;
      p.vy += dy * CONFIG.SPRING_STRENGTH;

      // 2. Noise / Jitter
      // We use a pseudo-random jitter based on particle index to avoid "white noise" look
      p.vx += (Math.random() - 0.5) * CONFIG.JITTER_AMP;
      p.vy += (Math.random() - 0.5) * CONFIG.JITTER_AMP;

      // 3. Hotspot Repulsion / Excitation
      let nearHotspot = false;
      hotspots.forEach(h => {
        const hdx = p.x - h.x;
        const hdy = p.y - h.y;
        const distSq = hdx*hdx + hdy*hdy;
        const rSq = h.radius * h.radius;

        if (distSq < rSq) {
          // If inside active hotspot, get excited
          if (h.intensity > 0.1) {
            nearHotspot = true;
            // Push away slightly to create "bubble" effect or orbit
            const force = (1 - distSq / rSq) * h.intensity * 0.2;
            p.vx += (hdx / Math.sqrt(distSq)) * force;
            p.vy += (hdy / Math.sqrt(distSq)) * force;
            
            // Add extra energy
            p.vx += (Math.random() - 0.5) * h.intensity;
            p.vy += (Math.random() - 0.5) * h.intensity;
          }
        }
      });
      
      p.isHot = nearHotspot;

      // 4. Damping
      p.vx *= CONFIG.FRICTION;
      p.vy *= CONFIG.FRICTION;

      // 5. Integration
      p.x += p.vx;
      p.y += p.vy;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. Trails (Clear with alpha)
    // We assume background is black constants.ts
    ctx.fillStyle = `rgba(5, 5, 5, ${CONFIG.TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);

    const { particles, hotspots } = stateRef.current;

    // 2. Draw Hotspots (Glow / Radial Gradient)
    ctx.globalCompositeOperation = 'screen';
    hotspots.forEach(h => {
      if (h.intensity < 0.01) return;
      
      const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
      // Red risk zone with varying opacity based on phase
      grad.addColorStop(0, `rgba(255, 0, 85, ${0.4 * h.intensity})`);
      grad.addColorStop(0.6, `rgba(255, 0, 85, ${0.1 * h.intensity})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // 3. Draw Threads (Lines between particles)
    // This is O(N^2), but N is small (<200)
    ctx.lineWidth = 1;
    
    // Batch stroke calls? It's better to beginPath/stroke per style group
    // But for varying alpha, we might need individual calls or grouping by distance buckets.
    // For simplicity and "glitchy" look, we just draw.
    
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      // Only check forward to avoid duplicates
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < CONFIG.CONNECTION_DIST_SQ) {
          const dist = Math.sqrt(distSq);
          const maxDist = Math.sqrt(CONFIG.CONNECTION_DIST_SQ);
          const alpha = 1 - (dist / maxDist);
          
          if (alpha > 0.05) {
            // Determine color: if either is hot, line is red-ish
            if (p1.isHot || p2.isHot) {
               ctx.strokeStyle = `rgba(255, 0, 85, ${alpha * 0.8})`;
               ctx.shadowBlur = 5;
               ctx.shadowColor = CONFIG.COLOR_RED;
            } else {
               ctx.strokeStyle = `rgba(0, 242, 255, ${alpha * 0.3})`;
               ctx.shadowBlur = 0; // optimization: no blur for faint lines
            }
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }
    
    // Reset shadow for particles
    ctx.shadowBlur = 0;

    // 4. Draw Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      if (p.isHot) {
        ctx.fillStyle = CONFIG.COLOR_RED;
        ctx.shadowBlur = 10;
        ctx.shadowColor = CONFIG.COLOR_RED;
      } else {
        ctx.fillStyle = CONFIG.COLOR_TEAL;
        ctx.shadowBlur = 4;
        ctx.shadowColor = CONFIG.COLOR_TEAL;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.isHot ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const tick = (time: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    updatePhysics(time);
    draw(ctx, stateRef.current.width, stateRef.current.height);

    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    // Initial Setup
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
          initSimulation(parent.clientWidth, parent.clientHeight);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Trigger once

    // Start Loop
    requestRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      {/* Optional Overlay to verify it's React */}
      <div className="absolute top-4 left-4 text-xs font-mono text-teal-500/50 pointer-events-none select-none">
        <div className="flex flex-col gap-1">
          <span>ENGINE: STARTED</span>
          <span>CYCLES: 18s LOOP</span>
          <span>CLUSTER_MODE: SPRING_LOCK</span>
        </div>
      </div>
    </div>
  );
};

export default EngineCanvas;