
import { Vector2, Node, Sector, Thread } from '../types';

export const SECTOR_COUNT = 6;
export const NODE_COUNT_PER_SECTOR = 15;
export const SPRING_K = 0.05;
export const DAMPING = 0.92;
export const INTER_SECTOR_THRESHOLD = 0.6;
export const JITTER_PEAK = 0.5;

export const createInitialState = (width: number, height: number) => {
  const sectors: Sector[] = [];
  const sectorNames = ['Financials', 'Tech', 'Energy', 'Healthcare', 'Materials', 'Utilities'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  for (let i = 0; i < SECTOR_COUNT; i++) {
    const angle = (i / SECTOR_COUNT) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.3;
    sectors.push({
      id: i,
      name: sectorNames[i],
      center: {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      },
      mass: 50 + Math.random() * 100,
      color: colors[i]
    });
  }

  const nodes: Node[] = [];
  const threads: Thread[] = [];

  for (let s = 0; s < SECTOR_COUNT; s++) {
    const sectorNodes: number[] = [];
    for (let n = 0; n < NODE_COUNT_PER_SECTOR; n++) {
      const id = s * NODE_COUNT_PER_SECTOR + n;
      const offset = (Math.random() - 0.5) * 50;
      nodes.push({
        id,
        sectorId: s,
        pos: { x: sectors[s].center.x + offset, y: sectors[s].center.y + offset },
        vel: { x: 0, y: 0 },
        acc: { x: 0, y: 0 },
        mass: 1 + Math.random() * 2,
      });
      sectorNodes.push(id);
    }

    // Intra-sector threads (Initial structure)
    for (let i = 0; i < sectorNodes.length; i++) {
      for (let j = i + 1; j < sectorNodes.length; j++) {
        if (Math.random() > 0.6) {
          threads.push({
            sourceId: sectorNodes[i],
            targetId: sectorNodes[j],
            length: 20 + Math.random() * 30,
            strength: 0.1,
            isInterSector: false
          });
        }
      }
    }
  }

  // Inter-sector potential threads (dormant initially)
  for (let s1 = 0; s1 < SECTOR_COUNT; s1++) {
    for (let s2 = s1 + 1; s2 < SECTOR_COUNT; s2++) {
      if (Math.random() > 0.4) {
        const id1 = s1 * NODE_COUNT_PER_SECTOR + Math.floor(Math.random() * NODE_COUNT_PER_SECTOR);
        const id2 = s2 * NODE_COUNT_PER_SECTOR + Math.floor(Math.random() * NODE_COUNT_PER_SECTOR);
        threads.push({
          sourceId: id1,
          targetId: id2,
          length: 150 + Math.random() * 100,
          strength: 0.05,
          isInterSector: true
        });
      }
    }
  }

  return { nodes, sectors, threads };
};

export const updatePhysics = (
  nodes: Node[],
  sectors: Sector[],
  threads: Thread[],
  progress: number,
  dt: number
) => {
  // Reset acceleration
  nodes.forEach(node => {
    node.acc = { x: 0, y: 0 };
    
    // Spring to sector center
    const sector = sectors[node.sectorId];
    const dx = sector.center.x - node.pos.x;
    const dy = sector.center.y - node.pos.y;
    node.acc.x += dx * SPRING_K * 0.5;
    node.acc.y += dy * SPRING_K * 0.5;
  });

  // Thread forces
  threads.forEach(thread => {
    // Only process inter-sector threads after threshold
    if (thread.isInterSector && progress < INTER_SECTOR_THRESHOLD) return;

    const n1 = nodes[thread.sourceId];
    const n2 = nodes[thread.targetId];

    const dx = n2.pos.x - n1.pos.x;
    const dy = n2.pos.y - n1.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const force = (dist - thread.length) * thread.strength;
    
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    n1.acc.x += fx / n1.mass;
    n1.acc.y += fy / n1.mass;
    n2.acc.x -= fx / n2.mass;
    n2.acc.y -= fy / n2.mass;
  });

  // Jitter (Peak at 0.5)
  const jitterIntensity = Math.max(0, 1 - Math.abs(progress - JITTER_PEAK) * 4);
  if (jitterIntensity > 0) {
    nodes.forEach(node => {
      node.acc.x += (Math.random() - 0.5) * jitterIntensity * 5;
      node.acc.y += (Math.random() - 0.5) * jitterIntensity * 5;
    });
  }

  // Integration
  nodes.forEach(node => {
    node.vel.x = (node.vel.x + node.acc.x) * DAMPING;
    node.vel.y = (node.vel.y + node.acc.y) * DAMPING;
    node.pos.x += node.vel.x;
    node.pos.y += node.vel.y;
  });
};
