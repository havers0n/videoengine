
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationConfig, SimulationState, Particle, Vector2D } from './types';
import { INITIAL_CONFIG, MAX_TRAIL_LENGTH, STRESS_DECAY, NOISE_SCALE } from './constants';
import ControlPanel from './components/ControlPanel';
import { observeSimulation } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  const [observation, setObservation] = useState<string>("Initializing quantum matrix...");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Simulation state refs for performance (bypassing React render cycle for the physics engine)
  const particlesRef = useRef<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimulationState>({
    particles: [],
    avgStress: 0,
    activeClusters: 0,
    tickCount: 0
  });

  const generateInitialParticles = useCallback((count: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        id: Math.random().toString(36).substr(2, 9),
        pos: { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight },
        vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        acc: { x: 0, y: 0 },
        mass: 0.5 + Math.random() * 1.5,
        stress: 0,
        clusterId: null,
        history: []
      });
    }
    return particles;
  }, []);

  // Initialize
  useEffect(() => {
    particlesRef.current = generateInitialParticles(config.particleCount);
    
    const obsInterval = setInterval(async () => {
      setIsAnalyzing(true);
      const report = await observeSimulation(stateRef.current);
      setObservation(report);
      setIsAnalyzing(false);
    }, 15000); // Analyze every 15s

    return () => clearInterval(obsInterval);
  }, [generateInitialParticles, config.particleCount]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Deterministic Noise Function (Simple Perlin approximation for 2D)
  const getNoise = (x: number, y: number, time: number) => {
    const value = Math.sin(x * NOISE_SCALE + time * 0.01) * Math.cos(y * NOISE_SCALE + time * 0.02);
    return value;
  };

  // Main Physics Update (Deterministic Logic)
  const update = useCallback((time: number) => {
    const particles = particlesRef.current;
    const { width, height } = canvasRef.current || { width: window.innerWidth, height: window.innerHeight };
    
    let totalStress = 0;
    let clusters = new Map<number, number>();

    // Phase 1: Reset Acceleration & Interaction logic
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      p1.acc = { x: 0, y: 0 };
      p1.clusterId = null;

      // Noise Injection (Deterministic modulation)
      const noiseX = getNoise(p1.pos.x, p1.pos.y, time);
      const noiseY = getNoise(p1.pos.y, p1.pos.x, time);
      p1.acc.x += noiseX * config.noiseIntensity;
      p1.acc.y += noiseY * config.noiseIntensity;

      // Deterministic Entity Interactions (Simple Flocking/Clustering)
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        const p2 = particles[j];
        const dx = p2.pos.x - p1.pos.x;
        const dy = p2.pos.y - p1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < config.clusteringRadius) {
          // Attraction to clusters
          const force = config.attractionForce / (dist + 1);
          p1.acc.x += (dx / dist) * force;
          p1.acc.y += (dy / dist) * force;
          
          // Stress increases when interacting closely
          p1.stress = Math.min(1, p1.stress + 0.01);
          
          // Synchronize velocities slightly
          p1.vel.x += (p2.vel.x - p1.vel.x) * 0.01;
          p1.vel.y += (p2.vel.y - p1.vel.y) * 0.01;
          
          // Assign visual cluster indicator (simplistic)
          p1.clusterId = i < j ? i : j;
        } else if (dist < config.clusteringRadius * 0.4) {
          // Repulsion for personal space
          const force = config.repulsionForce;
          p1.acc.x -= (dx / dist) * force;
          p1.acc.y -= (dy / dist) * force;
        }
      }

      // Physics Integration
      p1.vel.x = (p1.vel.x + p1.acc.x) * config.friction;
      p1.vel.y = (p1.vel.y + p1.acc.y) * config.friction;

      // Limit speed
      const speed = Math.sqrt(p1.vel.x * p1.vel.x + p1.vel.y * p1.vel.y);
      if (speed > config.speedLimit) {
        p1.vel.x = (p1.vel.x / speed) * config.speedLimit;
        p1.vel.y = (p1.vel.y / speed) * config.speedLimit;
      }

      // Stress Decay
      p1.stress *= STRESS_DECAY;

      // Update Position
      p1.pos.x += p1.vel.x;
      p1.pos.y += p1.vel.y;

      // History for trails
      p1.history.unshift({ ...p1.pos });
      if (p1.history.length > MAX_TRAIL_LENGTH) p1.history.pop();

      // Screen Wrapping
      if (p1.pos.x < 0) p1.pos.x = width;
      if (p1.pos.x > width) p1.pos.x = 0;
      if (p1.pos.y < 0) p1.pos.y = height;
      if (p1.pos.y > height) p1.pos.y = 0;

      totalStress += p1.stress;
      if (p1.clusterId !== null) clusters.set(p1.clusterId, (clusters.get(p1.clusterId) || 0) + 1);
    }

    stateRef.current = {
      particles,
      avgStress: totalStress / particles.length,
      activeClusters: clusters.size,
      tickCount: stateRef.current.tickCount + 1
    };
  }, [config]);

  // Render Phase
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fade effect for smoother motion
    ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;

    particles.forEach(p => {
      // Color based on stress and velocity
      const hue = 180 + p.stress * 100; // Cyan to Magenta
      const brightness = 40 + p.stress * 60;
      const alpha = 0.3 + p.stress * 0.7;

      // Trails
      if (p.history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue}, 80%, ${brightness}%, ${alpha * 0.5})`;
        ctx.lineWidth = 1 + p.stress * 2;
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        ctx.stroke();
      }

      // Core Glow
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, 4 + p.stress * 10);
      gradient.addColorStop(0, `hsla(${hue}, 90%, 70%, ${alpha})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.arc(p.pos.x, p.pos.y, 10 + p.stress * 15, 0, Math.PI * 2);
      ctx.fill();

      // Entity Core
      ctx.beginPath();
      ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${alpha + 0.2})`;
      ctx.arc(p.pos.x, p.pos.y, 1.5 + p.stress * 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  // Frame Loop
  useEffect(() => {
    let animationFrameId: number;
    const loop = (time: number) => {
      update(time);
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, render]);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
      
      <ControlPanel 
        config={config} 
        onChange={(newConfig) => setConfig(prev => ({ ...prev, ...newConfig }))}
        onReset={() => {
          particlesRef.current = generateInitialParticles(config.particleCount);
          stateRef.current.tickCount = 0;
        }}
        observation={observation}
        isAnalyzing={isAnalyzing}
      />

      <div className="fixed bottom-6 right-6 text-slate-500 font-mono text-[10px] uppercase tracking-widest flex flex-col items-end gap-1">
        <div>Tick Index: {stateRef.current.tickCount}</div>
        <div>System Energy: {(stateRef.current.avgStress * 100).toFixed(1)}%</div>
        <div>Clusters: {stateRef.current.activeClusters}</div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05)_0%,transparent_70%)]" />
    </div>
  );
};

export default App;
