import { SimState, Cluster, Thread, Hotspot, Vector2 } from './state';
import { EngineParams } from '../config/params';

function distanceSq(v1: Vector2, v2: Vector2): number {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  return dx * dx + dy * dy;
}

export function applyForces(state: SimState) {
  const { clusters, threads, hotspots } = state;

  // Reset accelerations
  for (const c of clusters) {
    c.acc.x = 0;
    c.acc.y = 0;
    c.stress = 0; // Decay stress frame by frame for calculation
  }

  // 1. Thread Springs
  for (const t of threads) {
    const c1 = clusters.find(c => c.id === t.sourceId);
    const c2 = clusters.find(c => c.id === t.targetId);
    if (!c1 || !c2) continue;

    const dx = c2.pos.x - c1.pos.x;
    const dy = c2.pos.y - c1.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Store for render
    t.currentLength = dist;

    if (dist === 0) continue;

    // Hooke's Law
    const forceMag = (dist - t.restLength) * EngineParams.SPRING_K;
    const fx = (dx / dist) * forceMag;
    const fy = (dy / dist) * forceMag;

    c1.acc.x += fx / c1.mass;
    c1.acc.y += fy / c1.mass;
    c2.acc.x -= fx / c2.mass;
    c2.acc.y -= fy / c2.mass;

    // Calculate tension for visualization
    t.tension = Math.abs(forceMag);
  }

  // 2. Hotspot Repulsion ("Stress Field")
  for (const h of hotspots) {
    for (const c of clusters) {
      const d2 = distanceSq(c.pos, h.pos);
      const radiusSq = EngineParams.HOTSPOT_RADIUS * EngineParams.HOTSPOT_RADIUS;

      if (d2 < radiusSq) {
        const dist = Math.sqrt(d2);
        const strength = (1 - dist / EngineParams.HOTSPOT_RADIUS) * EngineParams.HOTSPOT_STRENGTH;
        
        // Direction away from hotspot
        const dx = c.pos.x - h.pos.x;
        const dy = c.pos.y - h.pos.y;
        
        // Add force
        c.acc.x += (dx / dist) * strength * 0.05;
        c.acc.y += (dy / dist) * strength * 0.05;

        // Add stress to cluster
        c.stress = Math.min(1, c.stress + strength / 500);
      }
    }
  }

  // 3. Noise Jitter (Deterministic)
  // Use a pseudo-random sinusodal function based on time and ID for determinism without eating RNG calls
  for (const c of clusters) {
    const timeScale = state.time * 2;
    const noiseX = Math.sin(timeScale + c.id * 34.21) * Math.cos(timeScale * 0.5 + c.id);
    const noiseY = Math.cos(timeScale + c.id * 12.44) * Math.sin(timeScale * 0.3 + c.id);

    c.acc.x += noiseX * EngineParams.NOISE_FORCE;
    c.acc.y += noiseY * EngineParams.NOISE_FORCE;
  }
  
  // 4. Center Gravity (Keep them on screen)
  const cx = state.width / 2;
  const cy = state.height / 2;
  for (const c of clusters) {
    const dx = cx - c.pos.x;
    const dy = cy - c.pos.y;
    c.acc.x += dx * 0.005;
    c.acc.y += dy * 0.005;
  }
}