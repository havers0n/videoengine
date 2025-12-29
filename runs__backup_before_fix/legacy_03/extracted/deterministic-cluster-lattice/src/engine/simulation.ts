import { CONFIG, SEED } from '../../constants';
import { initRng, random, randomRange } from './rng';
import { lerp, distSq, easeInOutCubic } from './math';
import { SimulationState, Particle, Cluster, Hotspot } from './types';

// Initialize the world state deterministically
export const initSimulation = (width: number, height: number): SimulationState => {
  initRng(SEED);

  const clusters: Cluster[] = [];
  for (let i = 0; i < CONFIG.CLUSTER_COUNT; i++) {
    clusters.push({
      id: i,
      x: randomRange(width * 0.2, width * 0.8),
      y: randomRange(height * 0.2, height * 0.8),
      targetX: 0,
      targetY: 0,
      phaseOffset: random() * Math.PI * 2,
    });
  }

  const particles: Particle[] = [];
  for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
    const clusterIndex = Math.floor(random() * CONFIG.CLUSTER_COUNT);
    const cluster = clusters[clusterIndex];
    const angle = random() * Math.PI * 2;
    const dist = randomRange(0, 150);
    
    particles.push({
      x: cluster.x + Math.cos(angle) * dist,
      y: cluster.y + Math.sin(angle) * dist,
      vx: randomRange(-10, 10),
      vy: randomRange(-10, 10),
      clusterIndex,
      history: [],
      heat: 0,
    });
  }

  const hotspots: Hotspot[] = [
    { x: 0, y: 0, active: false, angle: 0, speed: 1.5, radius: 200 },
    { x: 0, y: 0, active: false, angle: Math.PI, speed: -1.2, radius: 250 },
    { x: 0, y: 0, active: false, angle: Math.PI * 0.5, speed: 2.0, radius: 180 },
  ];

  return {
    time: 0,
    clusters,
    particles,
    hotspots,
  };
};

export const updateSimulation = (state: SimulationState, dt: number, width: number, height: number) => {
  state.time += dt * 1000; // time in ms
  const tSec = state.time / 1000;
  
  // NARRATIVE CONTROL
  // 0-6s: Calm
  // 6-12s: Hotspots Active (Agitation)
  // 12-18s: Structure (Crystallization)
  
  const isPhase2 = tSec >= 6 && tSec < 12;
  const isPhase3 = tSec >= 12;
  const phase2Progress = isPhase2 ? (tSec - 6) / 6 : (tSec >= 12 ? 1 : 0);
  const phase3Progress = isPhase3 ? (tSec - 12) / 6 : 0;

  // 1. Update Clusters
  state.clusters.forEach((cluster, i) => {
    if (isPhase3) {
      // Form a grid/hexagon structure in Phase 3
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      // Arrange 0 in center, others in circle
      if (i === 0) {
        cluster.targetX = centerX;
        cluster.targetY = centerY;
      } else {
        const angle = ((i - 1) / (CONFIG.CLUSTER_COUNT - 1)) * Math.PI * 2 - Math.PI / 2;
        cluster.targetX = centerX + Math.cos(angle) * radius;
        cluster.targetY = centerY + Math.sin(angle) * radius;
      }
      
      // Strict approach in Phase 3
      const approachSpeed = 2.0 * easeInOutCubic(phase3Progress);
      cluster.x = lerp(cluster.x, cluster.targetX, dt * approachSpeed);
      cluster.y = lerp(cluster.y, cluster.targetY, dt * approachSpeed);
    } else {
      // Drift gently in Phase 1 & 2
      const sway = isPhase2 ? 100 : 50; // More jitter in phase 2
      const speed = isPhase2 ? 0.8 : 0.3;
      cluster.x += Math.cos(state.time * 0.001 * speed + cluster.phaseOffset) * speed;
      cluster.y += Math.sin(state.time * 0.0013 * speed + cluster.phaseOffset) * speed;
    }
  });

  // 2. Update Hotspots
  state.hotspots.forEach((spot, i) => {
    spot.active = isPhase2 || (isPhase3 && phase3Progress < 0.5); // Fade out halfway through phase 3
    if (spot.active) {
      spot.angle += spot.speed * dt;
      // Lissajous-ish movement
      spot.x = width / 2 + Math.cos(spot.angle) * (width * 0.4);
      spot.y = height / 2 + Math.sin(spot.angle * 0.7) * (height * 0.4);
    } else {
      spot.x = -1000;
      spot.y = -1000;
    }
  });

  // 3. Update Particles
  state.particles.forEach((p) => {
    const cluster = state.clusters[p.clusterIndex];
    
    // -- FORCES --
    
    // A. Cluster Attraction
    const dx = cluster.x - p.x;
    const dy = cluster.y - p.y;
    const distToClusterSq = dx * dx + dy * dy;
    
    // Tighter pull in Phase 3
    const attractionStr = isPhase3 ? 3.0 : 0.8; 
    p.vx += dx * attractionStr * dt;
    p.vy += dy * attractionStr * dt;

    // B. Hotspot Repulsion & Heat
    let externalHeat = 0;
    if (state.hotspots.some(h => h.active)) {
      state.hotspots.forEach(spot => {
        if (!spot.active) return;
        const hdx = p.x - spot.x;
        const hdy = p.y - spot.y;
        const hDistSq = hdx * hdx + hdy * hdy;
        const effectRadiusSq = spot.radius * spot.radius;

        if (hDistSq < effectRadiusSq) {
          const force = (1 - hDistSq / effectRadiusSq) * 500;
          // Repel from hotspot
          p.vx += (hdx / Math.sqrt(hDistSq)) * force * dt;
          p.vy += (hdy / Math.sqrt(hDistSq)) * force * dt;
          externalHeat = Math.max(externalHeat, 1 - Math.sqrt(hDistSq) / spot.radius);
        }
      });
    }

    // Heat decay/increase
    if (externalHeat > 0) {
      p.heat = lerp(p.heat, 1, dt * 5);
    } else {
      p.heat = lerp(p.heat, 0, dt * 1);
    }
    
    // C. Noise / Brownian Motion
    const noiseSpeed = (isPhase2 ? 150 : 30) * (1 - p.heat * 0.5); // Less noise if hot (directed movement)
    p.vx += randomRange(-1, 1) * noiseSpeed * dt;
    p.vy += randomRange(-1, 1) * noiseSpeed * dt;

    // D. Damping (Friction)
    // High friction in Phase 3 to "freeze" structure
    const damping = isPhase3 ? 0.92 : 0.96;
    p.vx *= damping;
    p.vy *= damping;

    // -- INTEGRATION --
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // -- TRAILS --
    // Add current position to start of history
    p.history.unshift({ x: p.x, y: p.y });
    if (p.history.length > CONFIG.TRAIL_LENGTH) {
      p.history.pop();
    }
  });
};
