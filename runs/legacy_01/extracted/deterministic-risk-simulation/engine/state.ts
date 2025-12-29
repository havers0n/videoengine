import { createRng, randomRange } from './rng';
import { EngineParams } from '../config/params';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Cluster {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  mass: number;
  stress: number; // 0 to 1, derived from external forces
}

export interface Thread {
  sourceId: number;
  targetId: number;
  restLength: number;
  currentLength: number;
  tension: number;
}

export interface Hotspot {
  id: number;
  angle: number; // Parametric position on orbit
  orbitRadius: number;
  speed: number;
  pos: Vector2;
}

export interface SimState {
  time: number;
  frameCount: number;
  width: number;
  height: number;
  clusters: Cluster[];
  threads: Thread[];
  hotspots: Hotspot[];
  rng: () => number; // Keep RNG reference in state to pass to systems if needed
}

export function initState(seed: number, width: number, height: number): SimState {
  const rng = createRng(seed);
  const centerX = width / 2;
  const centerY = height / 2;
  const minDim = Math.min(width, height);

  // Initialize Clusters
  const clusters: Cluster[] = [];
  for (let i = 0; i < EngineParams.CLUSTER_COUNT; i++) {
    clusters.push({
      id: i,
      pos: {
        x: centerX + randomRange(rng, -minDim * 0.3, minDim * 0.3),
        y: centerY + randomRange(rng, -minDim * 0.3, minDim * 0.3),
      },
      vel: { x: 0, y: 0 },
      acc: { x: 0, y: 0 },
      mass: EngineParams.CLUSTER_MASS,
      stress: 0,
    });
  }

  // Initialize Threads (Simple MST-ish or nearest neighbor connection)
  // For simplicity: Connect each node to its 2 nearest neighbors to form a graph
  const threads: Thread[] = [];
  const connections = new Set<string>();

  clusters.forEach(c1 => {
    // Find distances
    const dists = clusters
      .filter(c2 => c1.id !== c2.id)
      .map(c2 => {
        const dx = c1.pos.x - c2.pos.x;
        const dy = c1.pos.y - c2.pos.y;
        return { id: c2.id, dist: Math.sqrt(dx * dx + dy * dy) };
      })
      .sort((a, b) => a.dist - b.dist);

    // Connect to closest 2
    for (let i = 0; i < Math.min(dists.length, 2); i++) {
      const targetId = dists[i].id;
      const key = c1.id < targetId ? `${c1.id}-${targetId}` : `${targetId}-${c1.id}`;
      
      if (!connections.has(key)) {
        connections.add(key);
        threads.push({
          sourceId: c1.id,
          targetId: targetId,
          restLength: dists[i].dist * 1.05, // Slight slack
          currentLength: dists[i].dist,
          tension: 0,
        });
      }
    }
  });

  // Ensure fully connected graph by connecting outliers (optional, skipping for brevity/chaos)

  // Initialize Hotspots
  const hotspots: Hotspot[] = [];
  for (let i = 0; i < EngineParams.HOTSPOT_COUNT; i++) {
    hotspots.push({
      id: i,
      angle: randomRange(rng, 0, Math.PI * 2),
      orbitRadius: minDim * 0.35 * (0.8 + rng() * 0.4),
      speed: (rng() < 0.5 ? -1 : 1) * EngineParams.HOTSPOT_SPEED * randomRange(rng, 0.5, 1.5),
      pos: { x: 0, y: 0 }, // Calculated in update
    });
  }

  return {
    time: 0,
    frameCount: 0,
    width,
    height,
    clusters,
    threads,
    hotspots,
    rng,
  };
}