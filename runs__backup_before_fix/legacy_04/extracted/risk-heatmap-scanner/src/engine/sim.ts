import { EngineState, Node, Cluster, ScanRing, Hotspot } from '../types';
import { createRng } from './rng';

const rng = createRng(12345);
const random = () => rng();

// Helper to initialize state
export function initSimulation(width: number, height: number): EngineState {
  const clusters: Cluster[] = [];
  const nodes: Node[] = [];
  const scanRings: ScanRing[] = [];
  
  // Create Clusters
  const clusterCount = 5;
  const colors = ["#ef4444", "#f97316", "#eab308", "#10b981", "#3b82f6"]; // Tailwind colors

  for (let i = 0; i < clusterCount; i++) {
    clusters.push({
      id: i,
      centerX: width * 0.2 + random() * width * 0.6,
      centerY: height * 0.2 + random() * height * 0.6,
      driftX: (random() - 0.5) * 20,
      driftY: (random() - 0.5) * 20,
      color: colors[i % colors.length]
    });
  }

  // Create Nodes within clusters
  let nodeId = 0;
  clusters.forEach(cluster => {
    const count = 20 + Math.floor(random() * 30);
    for (let j = 0; j < count; j++) {
      const angle = random() * Math.PI * 2;
      const dist = random() * 150; // spread
      nodes.push({
        id: nodeId++,
        x: cluster.centerX + Math.cos(angle) * dist,
        y: cluster.centerY + Math.sin(angle) * dist,
        vx: (random() - 0.5) * 10,
        vy: (random() - 0.5) * 10,
        radius: 2 + random() * 3,
        riskLevel: random(),
        clusterId: cluster.id,
        active: false,
        pulsePhase: random() * Math.PI * 2
      });
    }
  });

  return {
    width,
    height,
    time: 0,
    nodes,
    clusters,
    scanRings,
    hotspots: [],
    mouse: { x: width / 2, y: height / 2 }
  };
}

export function updateSimulation(state: EngineState, dt: number) {
  state.time += dt;

  // 1. Update Clusters (drift)
  state.clusters.forEach(cluster => {
    cluster.centerX += cluster.driftX * dt;
    cluster.centerY += cluster.driftY * dt;

    // Bounce off walls (soft)
    if (cluster.centerX < 100 || cluster.centerX > state.width - 100) cluster.driftX *= -1;
    if (cluster.centerY < 100 || cluster.centerY > state.height - 100) cluster.driftY *= -1;
  });

  // 2. Spawn Scan Rings periodically
  if (Math.floor(state.time) > Math.floor(state.time - dt) && Math.floor(state.time) % 3 === 0) {
    // Every 3 seconds spawn a scanner from a random cluster
    const sourceCluster = state.clusters[Math.floor(random() * state.clusters.length)];
    state.scanRings.push({
      active: true,
      x: sourceCluster.centerX,
      y: sourceCluster.centerY,
      radius: 0,
      maxRadius: Math.max(state.width, state.height) * 0.8,
      speed: 300
    });
  }
  
  // Also spawn one from mouse click or center occasionally
  if (state.scanRings.length === 0 && state.time > 1) {
       state.scanRings.push({
      active: true,
      x: state.width/2,
      y: state.height/2,
      radius: 0,
      maxRadius: Math.max(state.width, state.height),
      speed: 250
    });
  }

  // 3. Update Scan Rings
  for (let i = state.scanRings.length - 1; i >= 0; i--) {
    const ring = state.scanRings[i];
    ring.radius += ring.speed * dt;
    if (ring.radius > ring.maxRadius) {
      state.scanRings.splice(i, 1);
    }
  }

  // 4. Update Nodes & Hotspots interaction
  state.nodes.forEach(node => {
    // Basic movement - cohesion to cluster center
    const cluster = state.clusters.find(c => c.id === node.clusterId);
    if (cluster) {
        const dx = cluster.centerX - node.x;
        const dy = cluster.centerY - node.y;
        node.vx += dx * 0.5 * dt;
        node.vy += dy * 0.5 * dt;
    }
    
    // Noise movement
    node.x += node.vx * dt;
    node.y += node.vy * dt;
    // Dampening
    node.vx *= 0.98;
    node.vy *= 0.98;

    node.pulsePhase += dt * 2;

    // Check interaction with Scan Rings
    let touchedByScan = false;
    state.scanRings.forEach(ring => {
        const dx = node.x - ring.x;
        const dy = node.y - ring.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (Math.abs(dist - ring.radius) < 20) {
            touchedByScan = true;
        }
    });

    if (touchedByScan) {
        node.active = true;
        // Chance to spawn hotspot
        if (node.riskLevel > 0.85 && random() > 0.95) {
             state.hotspots.push({
                 x: node.x,
                 y: node.y,
                 intensity: 1.0,
                 radius: 20 + random() * 30,
                 decay: 0.5 + random() * 0.5
             });
        }
    } else {
        node.active = false; 
        // Keep active if high risk? No, let them fade for scan effect
    }
  });

  // 5. Update Hotspots
  for (let i = state.hotspots.length - 1; i >= 0; i--) {
      const h = state.hotspots[i];
      h.intensity -= h.decay * dt;
      h.radius += 10 * dt;
      if (h.intensity <= 0) {
          state.hotspots.splice(i, 1);
      }
  }
}