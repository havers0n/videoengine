import React, { useRef, useEffect } from 'react';
import { SeededRNG } from '../utils/rng';

// --- Types & Constants ---
const CLUSTER_COUNT = 6;
const NODE_COUNT = 120;
const EDGE_COUNT_TARGET = 220;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// Narrative Timeline
const PHASE_BUILD_DURATION = 4.0;
const PHASE_CHAOS_DURATION = 12.0;
const PHASE_INSIGHT_DURATION = 18.0;

interface Point {
  x: number;
  y: number;
}

interface NodeEntity {
  id: number;
  x: number;
  y: number;
  baseX: number; // Original cluster position
  baseY: number;
  targetX: number; // For animation (insight phase)
  targetY: number;
  clusterId: number;
  radius: number;
  riskLevel: number; // 0.0 to 1.0
  color: string;
  connections: number[]; // Indices of connected nodes
  isHotspot: boolean;
  alpha: number; // For fade-in
}

interface EdgeEntity {
  source: number;
  target: number;
  length: number;
}

interface Impulse {
  fromNode: number;
  toNode: number;
  progress: number; // 0.0 to 1.0
  speed: number;
  energy: number; // Decreases slightly over distance
}

// Color Palette
const COLORS = {
  bg: '#0f172a',
  nodeBase: '#2dd4bf', // Teal 400
  nodeRisk: '#f87171', // Red 400
  edge: '#334155',     // Slate 700
  impulse: '#ffffff',
};

export const CausalGraph: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
    if (!ctx) return;

    // --- State Initialization (Ref-based, no React updates) ---
    const rng = new SeededRNG(12345); // Deterministic Seed
    
    let nodes: NodeEntity[] = [];
    let edges: EdgeEntity[] = [];
    let impulses: Impulse[] = [];
    
    // Narrative State
    let totalTime = 0;
    let cameraShake = { x: 0, y: 0, magnitude: 0 };
    
    // Initialize Graph
    const initGraph = () => {
      nodes = [];
      edges = [];
      impulses = [];
      totalTime = 0;
      cameraShake = { x: 0, y: 0, magnitude: 0 };

      // 1. Create Clusters
      const clusters: Point[] = [];
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        // Distribute clusters in a rough circle/ellipse
        const angle = (i / CLUSTER_COUNT) * Math.PI * 2;
        const dist = rng.nextRange(150, 300);
        clusters.push({
          x: CANVAS_WIDTH / 2 + Math.cos(angle) * dist,
          y: CANVAS_HEIGHT / 2 + Math.sin(angle) * dist * 0.8,
        });
      }

      // 2. Create Nodes
      for (let i = 0; i < NODE_COUNT; i++) {
        const clusterId = Math.floor(rng.nextFloat() * CLUSTER_COUNT);
        const center = clusters[clusterId];
        
        // Random scatter within cluster
        const angle = rng.nextFloat() * Math.PI * 2;
        const dist = rng.nextRange(0, 80);
        
        const x = center.x + Math.cos(angle) * dist;
        const y = center.y + Math.sin(angle) * dist;

        nodes.push({
          id: i,
          x,
          y,
          baseX: x,
          baseY: y,
          targetX: x,
          targetY: y,
          clusterId,
          radius: rng.nextRange(2, 5),
          riskLevel: 0,
          color: COLORS.nodeBase,
          connections: [],
          isHotspot: false, // Will set later
          alpha: 0,
        });
      }

      // 3. Set Hotspots (Source Nodes)
      // Pick 3 random nodes from different clusters to be hotspots
      const hotspotIndices: number[] = [];
      let attempts = 0;
      while (hotspotIndices.length < 3 && attempts < 100) {
        const idx = Math.floor(rng.nextFloat() * NODE_COUNT);
        const node = nodes[idx];
        // Try to pick nodes from different clusters
        const existingCluster = hotspotIndices.some(h => nodes[h].clusterId === node.clusterId);
        if (!existingCluster) {
          node.isHotspot = true;
          node.radius = 7;
          hotspotIndices.push(idx);
        }
        attempts++;
      }

      // 4. Create Edges
      // A. Intra-cluster connections (dense)
      for (let i = 0; i < NODE_COUNT; i++) {
        const nodeA = nodes[i];
        // Find closest neighbors in same cluster
        const neighbors = nodes
          .filter(n => n.id !== i && n.clusterId === nodeA.clusterId)
          .map(n => ({ id: n.id, dist: Math.hypot(n.x - nodeA.x, n.y - nodeA.y) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2); // Connect to 2 closest

        neighbors.forEach(n => {
          // Check duplicate
          if (!nodeA.connections.includes(n.id)) {
            edges.push({ source: i, target: n.id, length: n.dist });
            nodeA.connections.push(n.id);
            // One-way mostly, but let's ensure graph is somewhat traversable
          }
        });
      }

      // B. Inter-cluster connections (threads)
      let extraEdges = 0;
      while (extraEdges < 60) {
        const idxA = Math.floor(rng.nextFloat() * NODE_COUNT);
        const idxB = Math.floor(rng.nextFloat() * NODE_COUNT);
        const nodeA = nodes[idxA];
        const nodeB = nodes[idxB];

        if (nodeA.clusterId !== nodeB.clusterId && !nodeA.connections.includes(idxB)) {
             const dist = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
             if (dist < 400) { // Don't connect too far
                edges.push({ source: idxA, target: idxB, length: dist });
                nodeA.connections.push(idxB);
                extraEdges++;
             }
        }
      }
    };

    initGraph();

    // --- Helpers ---
    const getRiskColor = (level: number) => {
      // Linear interpolation between Teal and Red
      // Teal: 45, 212, 191
      // Red: 248, 113, 113
      const r = 45 + (248 - 45) * level;
      const g = 212 + (113 - 212) * level;
      const b = 191 + (113 - 191) * level;
      return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    };

    const triggerStress = (amount: number) => {
      cameraShake.magnitude = Math.min(cameraShake.magnitude + amount, 15);
    };

    // --- Fixed Timestep Loop ---
    let lastTime = performance.now();
    let accumulator = 0;
    const dt = 1 / 60;
    let animationFrameId: number;

    const update = (step: number) => {
      totalTime += step;

      // Narrative Phase Control
      
      // 0-4s: Build
      // Fade in nodes
      if (totalTime < PHASE_BUILD_DURATION) {
        nodes.forEach(n => {
           n.alpha = Math.min(n.alpha + step * 0.5, 1);
        });
      }

      // 12s: Insight Transition
      if (totalTime > PHASE_CHAOS_DURATION && totalTime < PHASE_CHAOS_DURATION + 2) {
         // Pull nodes tighter to their calculated "Insight" positions
         // Let's define the target as a tighter version of the original clusters
         // Calculate on the fly for demo simplicity
         const clusters: Point[] = [];
         for(let i=0; i<CLUSTER_COUNT; i++) {
            const angle = (i / CLUSTER_COUNT) * Math.PI * 2;
            // Tighter circle
            const dist = 120; 
            clusters.push({
                x: CANVAS_WIDTH/2 + Math.cos(angle) * dist,
                y: CANVAS_HEIGHT/2 + Math.sin(angle) * dist,
            });
         }
         
         nodes.forEach(n => {
            const c = clusters[n.clusterId];
            // Lerp towards center of cluster
            n.targetX = n.baseX * 0.3 + c.x * 0.7;
            n.targetY = n.baseY * 0.3 + c.y * 0.7;
         });
      }

      // Node Physics / Logic
      nodes.forEach(n => {
        // Risk decay
        n.riskLevel *= 0.98; // Decay
        if (n.riskLevel < 0.01) n.riskLevel = 0;

        // Position interpolation (Insight phase movement)
        const moveSpeed = 0.05;
        n.x += (n.targetX - n.x) * moveSpeed;
        n.y += (n.targetY - n.y) * moveSpeed;
      });

      // Impulse Spawning
      let spawnChance = 0.02; // Base chance
      if (totalTime > 4) spawnChance = 0.08; // Increase
      if (totalTime > 8) spawnChance = 0.15; // Chaos peak
      if (totalTime > 12) spawnChance = 0.05; // Focused

      if (totalTime < PHASE_INSIGHT_DURATION) {
        nodes.forEach(n => {
            if (n.isHotspot) {
                if (rng.nextFloat() < spawnChance) {
                    if (n.connections.length > 0) {
                        const targetIdx = n.connections[Math.floor(rng.nextFloat() * n.connections.length)];
                        impulses.push({
                            fromNode: n.id,
                            toNode: targetIdx,
                            progress: 0,
                            speed: rng.nextRange(0.8, 1.5), // Pixels per tick? No, let's do normalized speed
                            energy: 1.0
                        });
                    }
                }
            }
        });
      }

      // Update Impulses
      for (let i = impulses.length - 1; i >= 0; i--) {
        const imp = impulses[i];
        const start = nodes[imp.fromNode];
        const end = nodes[imp.toNode];
        
        // Calculate distance to normalize speed
        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const speedNorm = (imp.speed * 300) / (dist || 1); // Speed in pixels/sec roughly

        imp.progress += speedNorm * step;

        if (imp.progress >= 1) {
            // Hit target
            end.riskLevel = Math.min(end.riskLevel + 0.3 * imp.energy, 1.0);
            
            // Visual Impact
            if (end.riskLevel > 0.8) {
                triggerStress(2);
            }

            // Propagation logic
            // In chaos phase, scatter. In insight phase, focus on high-risk paths or linear paths?
            // Simple logic: Chance to propagate if energy remains
            if (imp.energy > 0.2 && end.connections.length > 0) {
                const propagateCount = (end.riskLevel > 0.5) ? 2 : 1;
                
                for(let k=0; k<propagateCount; k++) {
                    if(rng.nextFloat() < 0.6) {
                        const nextTarget = end.connections[Math.floor(rng.nextFloat() * end.connections.length)];
                        // Don't bounce back immediately ideally, but simple RNG is okay here
                        impulses.push({
                            fromNode: end.id,
                            toNode: nextTarget,
                            progress: 0,
                            speed: imp.speed,
                            energy: imp.energy * 0.7
                        });
                    }
                }
            }

            impulses.splice(i, 1);
        }
      }

      // Camera Shake Decay
      if (cameraShake.magnitude > 0) {
        cameraShake.x = (rng.nextFloat() - 0.5) * cameraShake.magnitude;
        cameraShake.y = (rng.nextFloat() - 0.5) * cameraShake.magnitude;
        cameraShake.magnitude *= 0.9;
        if (cameraShake.magnitude < 0.5) {
            cameraShake.magnitude = 0;
            cameraShake.x = 0;
            cameraShake.y = 0;
        }
      }
    };

    const render = () => {
      // Trails Effect: Draw semi-transparent rectangle instead of clearing
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Tailwind slate-900 with alpha
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      // Apply Camera Shake
      ctx.translate(cameraShake.x, cameraShake.y);

      // Draw Edges
      // We batch drawing to improve performance, but gradient lines require individual strokes usually.
      // Optimization: Only draw lines if nodes are visible
      ctx.lineWidth = 1;
      
      edges.forEach(edge => {
        const n1 = nodes[edge.source];
        const n2 = nodes[edge.target];
        
        if (n1.alpha <= 0 && n2.alpha <= 0) return;

        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        // Risk influences line color
        const c1 = n1.riskLevel > 0.3 ? COLORS.nodeRisk : COLORS.edge;
        const c2 = n2.riskLevel > 0.3 ? COLORS.nodeRisk : COLORS.edge;
        
        // Use very low opacity for base lines
        grad.addColorStop(0, c1.replace(')', ', 0.1)')); 
        grad.addColorStop(1, c2.replace(')', ', 0.1)'));
        
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      });

      // Draw Impulses
      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLORS.impulse;
      ctx.fillStyle = COLORS.impulse;
      
      impulses.forEach(imp => {
        const n1 = nodes[imp.fromNode];
        const n2 = nodes[imp.toNode];
        
        const ix = n1.x + (n2.x - n1.x) * imp.progress;
        const iy = n1.y + (n2.y - n1.y) * imp.progress;

        const size = 2 * imp.energy;
        ctx.beginPath();
        ctx.arc(ix, iy, size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0; // Reset for nodes

      // Draw Nodes
      nodes.forEach(n => {
        if (n.alpha <= 0) return;

        ctx.globalAlpha = n.alpha;
        const color = getRiskColor(n.riskLevel);
        
        // Glow for high risk
        if (n.riskLevel > 0.3) {
            ctx.shadowBlur = 15 * n.riskLevel;
            ctx.shadowColor = COLORS.nodeRisk;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        // Pulse size slightly with risk
        const r = n.radius + (n.riskLevel * 4);
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      ctx.restore();
    };

    const loop = () => {
      const now = performance.now();
      let frameTime = (now - lastTime) / 1000; // seconds
      if (frameTime > 0.25) frameTime = 0.25; // Cap for spiral of death
      
      lastTime = now;
      accumulator += frameTime;

      while (accumulator >= dt) {
        update(dt);
        accumulator -= dt;
      }

      // Check end of narrative for restart loop or stop? 
      // Requirement says "18 seconds". We can loop or hold. 
      // Let's hold at the final state to show the result.
      if (totalTime > PHASE_INSIGHT_DURATION + 2) {
         // Auto restart for demo purposes
         initGraph();
      }

      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    // Start
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full h-screen bg-slate-900">
      <div className="absolute top-4 left-4 z-10 text-white/50 font-mono text-sm pointer-events-none">
        <h1 className="text-white font-bold text-lg mb-2">RISK ENGINE v1.0</h1>
        <p>Fixed Timestep: 1/60s</p>
        <p>Entities: {NODE_COUNT} Nodes</p>
      </div>
      
      <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
         <canvas 
           ref={canvasRef} 
           width={CANVAS_WIDTH} 
           height={CANVAS_HEIGHT} 
           className="w-full max-w-[1000px] h-auto bg-slate-900 block"
         />
         {/* Simple Overlay for Narrative Phase */}
         <Overlay totalTimeRef={useRef(0)} />
      </div>
    </div>
  );
};

// Quick overlay component to visualize phases without re-rendering main canvas component
const Overlay: React.FC<{ totalTimeRef: React.MutableRefObject<number> }> = () => {
    const [info, setInfo] = React.useState({ phase: 'INIT', time: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            // This is a rough approximate for UI updates, decoupled from physics loop
            // In a real app we'd sync this better, but this avoids React render thrashing logic
            // We actually can't read the internal `totalTime` from here easily without context/store.
            // Since the requirements forbid setState in rAF, we'll just implement a simple separate timer for the UI
            // to mirror the deterministic engine duration.
            setInfo(prev => {
                const newTime = (prev.time + 0.1);
                let p = 'BOOT_SEQUENCE';
                if (newTime > 0 && newTime < 4) p = 'PHASE 1: NETWORK_DISCOVERY';
                if (newTime >= 4 && newTime < 12) p = 'PHASE 2: RISK_PROPAGATION';
                if (newTime >= 12 && newTime < 18) p = 'PHASE 3: CLUSTER_INSIGHT';
                if (newTime >= 18) return { phase: 'CYCLE_COMPLETE', time: 0 }; 
                
                return { phase: p, time: newTime };
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute bottom-4 right-4 text-right font-mono text-xs text-teal-400 pointer-events-none">
             <div className="text-xl font-bold tracking-widest">{info.phase}</div>
             <div className="text-slate-500">T+{info.time.toFixed(1)}s</div>
             <div className="mt-2 flex gap-1 justify-end">
                <div className={`h-1 w-8 ${info.time > 0 ? 'bg-teal-500' : 'bg-slate-700'}`}></div>
                <div className={`h-1 w-16 ${info.time > 4 ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                <div className={`h-1 w-8 ${info.time > 12 ? 'bg-white' : 'bg-slate-700'}`}></div>
             </div>
        </div>
    );
}
