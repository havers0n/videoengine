import React, { useRef, useEffect, useCallback, useState } from 'react';
import { defaultRNG, DeterministicRNG } from '../utils/rng';
import { NodeEntity, ScanWave, Particle, Vector2, EngineConfig } from '../types';

interface ScannerCanvasProps {
  config?: Partial<EngineConfig>;
  active: boolean;
}

const DEFAULT_CONFIG: EngineConfig = {
  nodeCount: 60,
  connectionThreshold: 150,
  scanSpeed: 250, // Pixels per second
  riskThreshold: 0.7,
};

export const ScannerCanvas: React.FC<ScannerCanvasProps> = ({ config = {}, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Mutable state for the engine to avoid React render cycles
  const engineState = useRef<{
    nodes: NodeEntity[];
    waves: ScanWave[];
    particles: Particle[];
    rng: DeterministicRNG;
    mouse: Vector2;
    dimensions: Vector2;
  }>({
    nodes: [],
    waves: [],
    particles: [],
    rng: new DeterministicRNG(Date.now()), // Seed with time for variety on reload, or fix for deterministic
    mouse: { x: -1000, y: -1000 },
    dimensions: { x: 0, y: 0 },
  });

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Helper: Create a generic node
  const createNode = (rng: DeterministicRNG, w: number, h: number): NodeEntity => {
    const risk = rng.next();
    // Concentrate nodes slightly towards center for better visuals
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.next() * (Math.min(w, h) * 0.45); 
    // Mix strictly random with polar distribution
    const usePolar = rng.chance(0.7);
    
    const x = usePolar ? w / 2 + Math.cos(angle) * dist : rng.range(0, w);
    const y = usePolar ? h / 2 + Math.sin(angle) * dist : rng.range(0, h);

    return {
      id: Math.random().toString(36).substr(2, 9),
      pos: { x, y },
      velocity: {
        x: rng.range(-15, 15), // Slow drift
        y: rng.range(-15, 15),
      },
      riskLevel: risk,
      active: false,
      scanIntensity: 0,
      radius: risk > mergedConfig.riskThreshold ? rng.range(4, 6) : rng.range(2, 3),
      connections: [],
    };
  };

  const spawnWave = (x: number, y: number, type: ScanWave['type'] = 'pulse') => {
    const { waves } = engineState.current;
    // Fix: Ensure dimensions are at least 1 to prevent division by zero in strength calculation
    const dimX = Math.max(engineState.current.dimensions.x, 1);
    const dimY = Math.max(engineState.current.dimensions.y, 1);
    const maxR = Math.max(dimX, dimY) * 0.8;
    
    waves.push({
      id: Math.random().toString(),
      origin: { x, y },
      currentRadius: 0,
      maxRadius: type === 'alert' ? maxR * 0.3 : maxR,
      speed: type === 'alert' ? mergedConfig.scanSpeed * 1.5 : mergedConfig.scanSpeed,
      strength: 1.0,
      type,
    });
  };

  // Initialization
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const { clientWidth: w, clientHeight: h } = containerRef.current;
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    engineState.current.dimensions = { x: w, y: h };

    // Initial population
    const nodes: NodeEntity[] = [];
    for (let i = 0; i < mergedConfig.nodeCount; i++) {
      nodes.push(createNode(engineState.current.rng, w, h));
    }
    engineState.current.nodes = nodes;

    // Initial Auto-Scan
    spawnWave(w / 2, h / 2, 'radar');

    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        engineState.current.dimensions = { 
          x: containerRef.current.clientWidth, 
          y: containerRef.current.clientHeight 
        };
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mergedConfig.nodeCount]);

  // Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      engineState.current.mouse = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleClick = () => {
    const { x, y } = engineState.current.mouse;
    spawnWave(x, y, 'alert');
  };

  // Main Loop
  const renderLoop = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { nodes, waves, particles, dimensions, mouse } = engineState.current;
    const w = dimensions.x;
    const h = dimensions.y;

    // 1. Clear & Fade Background
    ctx.fillStyle = 'rgba(5, 5, 8, 0.25)'; // Trail effect
    ctx.fillRect(0, 0, w, h);

    // 2. Update Physics & Logic
    
    // Update Waves
    for (let i = waves.length - 1; i >= 0; i--) {
      const wave = waves[i];
      wave.currentRadius += wave.speed * dt;
      // Protected division
      const div = wave.maxRadius > 0 ? wave.maxRadius : 1;
      wave.strength = 1 - (wave.currentRadius / div);
      
      if (wave.strength <= 0) {
        waves.splice(i, 1);
        continue;
      }

      // Check for node intersections
      nodes.forEach(node => {
        const dx = node.pos.x - wave.origin.x;
        const dy = node.pos.y - wave.origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If the wave edge is close to the node
        if (Math.abs(dist - wave.currentRadius) < 20) {
          node.scanIntensity = 1.0;
          node.active = true;
          
          // Chance to spawn particle on intersection
          if (Math.random() > 0.8) {
             particles.push({
               id: Math.random().toString(),
               pos: { ...node.pos },
               velocity: { x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 50 },
               life: 1.0,
               maxLife: 1.0,
               color: node.riskLevel > mergedConfig.riskThreshold ? '#ef4444' : '#06b6d4',
             });
          }
        }
      });
    }

    // Auto-spawn waves occasionally
    if (Math.random() < 0.005) { // Rare random ping
       spawnWave(w * Math.random(), h * Math.random(), 'pulse');
    }

    // Update Nodes
    nodes.forEach(node => {
      // Move
      node.pos.x += node.velocity.x * dt;
      node.pos.y += node.velocity.y * dt;

      // Bounce
      if (node.pos.x < 0 || node.pos.x > w) node.velocity.x *= -1;
      if (node.pos.y < 0 || node.pos.y > h) node.velocity.y *= -1;

      // Decay intensity
      if (node.scanIntensity > 0) {
        node.scanIntensity -= 0.8 * dt;
        if (node.scanIntensity < 0) node.scanIntensity = 0;
      }
      
      // Mouse proximity interaction
      const dx = mouse.x - node.pos.x;
      const dy = mouse.y - node.pos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 150) {
        node.scanIntensity = Math.min(node.scanIntensity + 2 * dt, 1);
      }
    });

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.pos.x += p.velocity.x * dt;
      p.pos.y += p.velocity.y * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 3. Drawing
    
    // Draw Connections (Threads)
    // Optimization: Only draw connections if at least one node is 'lit' or active
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = 'screen';
    
    // We only compute connections for active nodes to save performance
    // or compute all if N is small. N=60 is small enough to bruteforce O(N^2)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        
        // Optimisation: Skip if both are dark
        if (n1.scanIntensity < 0.05 && n2.scanIntensity < 0.05) continue;

        const dx = n1.pos.x - n2.pos.x;
        const dy = n1.pos.y - n2.pos.y;
        const distSq = dx * dx + dy * dy;
        const thresholdSq = mergedConfig.connectionThreshold * mergedConfig.connectionThreshold;

        if (distSq < thresholdSq) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / mergedConfig.connectionThreshold) * Math.max(n1.scanIntensity, n2.scanIntensity);
          
          if (alpha > 0.05) {
             const isRisk = n1.riskLevel > mergedConfig.riskThreshold || n2.riskLevel > mergedConfig.riskThreshold;
             ctx.strokeStyle = isRisk 
                ? `rgba(239, 68, 68, ${alpha * 0.8})` // Red
                : `rgba(6, 182, 212, ${alpha * 0.5})`; // Cyan
             
             ctx.beginPath();
             ctx.moveTo(n1.pos.x, n1.pos.y);
             ctx.lineTo(n2.pos.x, n2.pos.y);
             ctx.stroke();
          }
        }
      }
    }

    // Draw Waves (Scan Rings)
    ctx.globalCompositeOperation = 'lighter';
    waves.forEach(wave => {
      ctx.beginPath();
      ctx.arc(wave.origin.x, wave.origin.y, wave.currentRadius, 0, Math.PI * 2);
      ctx.lineWidth = wave.type === 'alert' ? 4 : 2;
      
      const color = wave.type === 'alert' ? '239, 68, 68' : (wave.type === 'radar' ? '6, 182, 212' : '168, 85, 247');
      
      // Gradient stroke for "leading edge" feel
      // Fix: Ensure r0 is non-negative
      const r0 = Math.max(0, wave.currentRadius - 5);
      const r1 = wave.currentRadius + 5;
      
      const gradient = ctx.createRadialGradient(
        wave.origin.x, wave.origin.y, r0,
        wave.origin.x, wave.origin.y, r1
      );
      
      // Fix: Safeguard alpha values to prevent syntax error (NaN)
      let alpha = wave.strength * 0.8;
      if (!isFinite(alpha)) alpha = 0;
      alpha = Math.max(0, Math.min(1, alpha));
      
      gradient.addColorStop(0, `rgba(${color}, 0)`);
      gradient.addColorStop(0.5, `rgba(${color}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      
      ctx.strokeStyle = gradient;
      ctx.stroke();
      
      // Fill faint inner
      let fillAlpha = wave.strength * 0.05;
      if (!isFinite(fillAlpha)) fillAlpha = 0;
      
      ctx.fillStyle = `rgba(${color}, ${fillAlpha})`;
      ctx.fill();
    });

    // Draw Particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Nodes (Hotspots)
    nodes.forEach(node => {
      const isHighRisk = node.riskLevel > mergedConfig.riskThreshold;
      const baseAlpha = 0.2 + (node.scanIntensity * 0.8);
      
      // Glow effect
      if (node.scanIntensity > 0.1) {
        ctx.shadowBlur = node.scanIntensity * (isHighRisk ? 15 : 10);
        ctx.shadowColor = isHighRisk ? '#ef4444' : '#06b6d4';
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = isHighRisk 
        ? `rgba(239, 68, 68, ${baseAlpha})` 
        : `rgba(6, 182, 212, ${baseAlpha})`;
      
      ctx.beginPath();
      // Animate radius slightly if scanned
      const r = node.radius + (node.scanIntensity * 2);
      ctx.arc(node.pos.x, node.pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath();
      ctx.arc(node.pos.x, node.pos.y, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Draw risk ring for hotspots
      if (isHighRisk && node.scanIntensity > 0.2) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${node.scanIntensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.pos.x, node.pos.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        
        // Label
        if (node.scanIntensity > 0.5) {
             ctx.font = '10px monospace';
             ctx.fillStyle = `rgba(239, 68, 68, ${node.scanIntensity})`;
             ctx.fillText(`RISK ${(node.riskLevel * 100).toFixed(0)}%`, node.pos.x + 10, node.pos.y - 10);
        }
      }
      
      ctx.shadowBlur = 0; // Reset
    });

    if (active) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
  }, [active, mergedConfig]);

  useEffect(() => {
    if (active) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [active, renderLoop]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="block w-full h-full"
      />
    </div>
  );
};