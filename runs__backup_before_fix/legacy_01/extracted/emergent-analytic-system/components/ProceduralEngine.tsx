import React, { useEffect, useRef } from 'react';

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------
const PARTICLE_COUNT = 160;
const CONNECTION_DISTANCE = 100;
const LOOP_DURATION = 18000; // ms
const BASE_SPEED = 0.8;

// Palette (Analytical / Dark Mode)
const COLORS = {
  bg: '#050505',
  node: 'rgba(200, 220, 230, 0.9)',
  link: 'rgba(100, 200, 255, 0.15)',
  linkActive: 'rgba(255, 255, 255, 0.4)',
  scanline: 'rgba(0, 255, 200, 0.05)',
};

// -----------------------------------------------------------------------------
// Math & Utility
// -----------------------------------------------------------------------------
const TAU = Math.PI * 2;

// Deterministic PRNG for consistent refreshing
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(0xcafe1234);

// Smoothstep for nice transitions
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface Vector {
  x: number;
  y: number;
}

interface Particle {
  id: number;
  pos: Vector;
  vel: Vector;
  acc: Vector;
  gridTarget: Vector; // The "hidden structure" position
  phase: number;      // Individual offset for oscillation
  mass: number;
}

interface SimState {
  particles: Particle[];
  width: number;
  height: number;
  time: number;
  coherence: number; // 0 = chaos, 1 = order
}

// -----------------------------------------------------------------------------
// Simulation Engine
// -----------------------------------------------------------------------------
const ProceduralEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  
  // Mutable state container
  const state = useRef<SimState>({
    particles: [],
    width: 0,
    height: 0,
    time: 0,
    coherence: 0,
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  const initSystem = (w: number, h: number) => {
    const p: Particle[] = [];
    const cols = Math.floor(Math.sqrt(PARTICLE_COUNT * (w / h)));
    const rows = Math.ceil(PARTICLE_COUNT / cols);
    const cellW = w / (cols + 2);
    const cellH = h / (rows + 2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Grid targets centered
      const col = i % cols;
      const row = Math.floor(i / cols);
      const targetX = (col + 1.5) * cellW + (random() - 0.5) * 20;
      const targetY = (row + 1.5) * cellH + (random() - 0.5) * 20;

      p.push({
        id: i,
        pos: { x: random() * w, y: random() * h },
        vel: { x: (random() - 0.5) * 2, y: (random() - 0.5) * 2 },
        acc: { x: 0, y: 0 },
        gridTarget: { x: targetX, y: targetY },
        phase: random() * TAU,
        mass: 1 + random() * 1.5,
      });
    }
    state.current.particles = p;
    state.current.width = w;
    state.current.height = h;
  };

  // ---------------------------------------------------------------------------
  // Update Logic (Physics & Behaviors)
  // ---------------------------------------------------------------------------
  const update = (dt: number, totalTime: number) => {
    const s = state.current;
    
    // 1. Calculate Global Coherence Cycle
    // A complex waveform that spends time in chaos, briefly locks, then dissolves.
    const loopProgress = (totalTime % LOOP_DURATION) / LOOP_DURATION;
    
    // Waveform: 0 -> chaos, 1 -> order
    // Uses sine combinations to create "searching" vs "locked" feel
    const wave1 = Math.sin(loopProgress * TAU); 
    const wave2 = Math.sin(loopProgress * TAU * 2 + Math.PI);
    
    // Coherence spikes briefly around 0.5 and 0.9
    let coherenceSignal = smoothstep(0.4, 0.6, Math.abs(wave1));
    
    // Add "glitch" drops in coherence
    if (loopProgress > 0.85 && loopProgress < 0.9) coherenceSignal *= 0.2;
    
    s.coherence = coherenceSignal;

    // Forces configuration
    const noiseScale = 0.002;
    const chaosStrength = 0.15 * (1 - s.coherence);
    const orderStrength = 0.005 * s.coherence;
    const damping = 0.94 + (0.04 * s.coherence); // More damping when ordered

    // Update Particles
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];

      // --- Force 1: Curl Noise / Drift (Destabilizing) ---
      // Simple pseudo-curl approximation
      const nx = p.pos.x * noiseScale + totalTime * 0.0001;
      const ny = p.pos.y * noiseScale + totalTime * 0.0002;
      
      const angle = (Math.sin(nx) * Math.cos(ny) * TAU * 2) + p.phase;
      const noiseFx = Math.cos(angle) * chaosStrength;
      const noiseFy = Math.sin(angle) * chaosStrength;

      p.acc.x += noiseFx;
      p.acc.y += noiseFy;

      // --- Force 2: Structural Attraction (Stabilizing) ---
      // Pull towards the hidden grid target
      const dx = p.gridTarget.x - p.pos.x;
      const dy = p.gridTarget.y - p.pos.y;
      
      // Spring force (Hooke's Law)
      p.acc.x += dx * orderStrength;
      p.acc.y += dy * orderStrength;

      // --- Force 3: Neighbor Repulsion (Local Structure) ---
      // Prevents complete collapse into single points
      // Only check a few neighbors for performance (simplified)
      if (i > 0) {
        const neighbor = s.particles[i - 1];
        const ndx = p.pos.x - neighbor.pos.x;
        const ndy = p.pos.y - neighbor.pos.y;
        const distSq = ndx * ndx + ndy * ndy;
        if (distSq < 400 && distSq > 0) {
           const force = 10 / distSq;
           p.acc.x += ndx * force;
           p.acc.y += ndy * force;
        }
      }

      // Integration (Euler)
      p.vel.x += p.acc.x;
      p.vel.y += p.acc.y;
      
      p.vel.x *= damping;
      p.vel.y *= damping;

      p.pos.x += p.vel.x * (dt / 16) * BASE_SPEED;
      p.pos.y += p.vel.y * (dt / 16) * BASE_SPEED;

      // Reset accel
      p.acc.x = 0;
      p.acc.y = 0;

      // Boundaries (Soft wrap)
      if (p.pos.x < 0) p.pos.x += s.width;
      if (p.pos.x > s.width) p.pos.x -= s.width;
      if (p.pos.y < 0) p.pos.y += s.height;
      if (p.pos.y > s.height) p.pos.y -= s.height;
    }
  };

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  const draw = (ctx: CanvasRenderingContext2D) => {
    const s = state.current;
    
    // 1. Trails (Alpha Decay)
    // We clear with very low opacity black to create trails
    ctx.fillStyle = `rgba(5, 5, 5, 0.2)`; 
    ctx.fillRect(0, 0, s.width, s.height);

    // 2. Draw Connections (Spatial Graph)
    // Opacity based on distance and global coherence
    ctx.lineWidth = 1;
    const connectDistSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

    // Optimization: only check subset or spatial hash. 
    // For <200 particles, O(N^2) is acceptable in 2D canvas if optimized.
    // We'll skip some iterations to keep it fast and "glitchy"
    
    ctx.beginPath();
    for (let i = 0; i < s.particles.length; i++) {
      const p1 = s.particles[i];
      
      // Draw Node
      // Size pulses with velocity
      const speed = Math.abs(p1.vel.x) + Math.abs(p1.vel.y);
      const radius = Math.max(1, 2 - speed * 0.5);
      
      // Color shifts from cyan (active) to grey (dormant)
      // High coherence = more white/bright
      const alpha = 0.4 + (s.coherence * 0.6);
      
      // Draw particle logic inline for batching? No, separate styles.
      // Actually, batching lines is better.
      
      // Check connections
      for (let j = i + 1; j < s.particles.length; j++) {
        const p2 = s.particles[j];
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < connectDistSq) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - dist / CONNECTION_DISTANCE;
          
          // Modulation: Connections are stronger when system is coherent
          // But also flicker during chaos
          const strength = proximity * (0.1 + s.coherence * 0.8);
          
          if (strength > 0.05) {
            ctx.moveTo(p1.pos.x, p1.pos.y);
            ctx.lineTo(p2.pos.x, p2.pos.y);
            // We can't change strokeStyle in the middle of a path efficiently for all lines
            // So we'll draw lines in a single pass with a low average opacity, 
            // or batch by strength (too complex).
            // Compromise: Single color, variable structure density.
          }
        }
      }
    }
    // Draw all accumulated lines
    ctx.strokeStyle = s.coherence > 0.6 ? COLORS.linkActive : COLORS.link;
    ctx.stroke();

    // 3. Draw Nodes (Markers)
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];
      const speed = Math.hypot(p.vel.x, p.vel.y);
      
      ctx.fillStyle = COLORS.node;
      
      // When locked (high coherence), draw geometric markers (crosses)
      // When chaotic, draw organic dots
      if (s.coherence > 0.7 && speed < 0.5) {
        const size = 3;
        ctx.fillRect(p.pos.x - size/2, p.pos.y - 0.5, size, 1);
        ctx.fillRect(p.pos.x - 0.5, p.pos.y - size/2, 1, size);
      } else {
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 1.2, 0, TAU);
        ctx.fill();
      }
    }

    // 4. Debug/Analysis Overlay (The "Understanding")
    // A scanning bar that appears when coherence is finding structure
    if (s.coherence > 0.3) {
      const scanY = (s.time * 0.1) % s.height;
      ctx.fillStyle = COLORS.scanline;
      ctx.fillRect(0, scanY, s.width, 2);
    }
  };

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let resizeObserver: ResizeObserver;
    let lastTime = performance.now();

    const onResize = () => {
      if (!canvas.parentElement) return;
      const { clientWidth, clientHeight } = canvas.parentElement;
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      // Re-init system on substantial resize to redistribute grid
      initSystem(clientWidth, clientHeight);
    };

    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 64); // Cap dt for tab switching safety
      lastTime = time;
      state.current.time = time;

      // Update
      update(dt, time);

      // Render
      draw(ctx);

      rafRef.current = requestAnimationFrame(loop);
    };

    // Setup
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas.parentElement!);
    onResize(); // Initial size
    
    // Start
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

export default ProceduralEngine;