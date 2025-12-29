import { EngineState, Particle, Hotspot } from '../../types';
import { mulberry32 } from './rng';

// Initialize the state deterministically
export function initState(width: number, height: number): EngineState {
  const seed = 123456;
  const rand = mulberry32(seed);

  const particles: Particle[] = [];
  const particleCount = 150;

  for (let i = 0; i < particleCount; i++) {
    const x = rand() * width;
    const y = rand() * height;
    particles.push({
      id: i,
      pos: { x, y },
      baseX: x,
      baseY: y,
      vel: { x: (rand() - 0.5) * 20, y: (rand() - 0.5) * 20 },
      noiseOffset: rand() * 1000,
      color: rand() > 0.8 ? '#ef4444' : '#0ea5e9', // Red for risk, Blue for safe
      connections: []
    });
  }

  // Pre-calculate connections for "clusters" and "threads"
  // Simple distance based connection to form clusters
  for (let i = 0; i < particleCount; i++) {
    const p1 = particles[i];
    let connectionsFound = 0;
    for (let j = i + 1; j < particleCount; j++) {
      if (connectionsFound > 3) break;
      const p2 = particles[j];
      const dx = p1.baseX - p2.baseX;
      const dy = p1.baseY - p2.baseY;
      const distSq = dx*dx + dy*dy;
      if (distSq < 150 * 150) { // Cluster threshold
        p1.connections.push(j);
        connectionsFound++;
      }
    }
  }

  const hotspots: Hotspot[] = [];
  const hotspotCount = 5;
  for (let i = 0; i < hotspotCount; i++) {
    hotspots.push({
      pos: { x: rand() * width, y: rand() * height },
      baseRadius: 50 + rand() * 50,
      radius: 50,
      intensity: 0,
      pulsePhase: rand() * Math.PI * 2,
      riskLevel: 0.5 + rand() * 0.5
    });
  }

  return {
    width,
    height,
    time: 0,
    scannerAngle: 0,
    particles,
    hotspots
  };
}

export function step(state: EngineState, dt: number) {
  state.time += dt;

  // Update Scanner
  state.scannerAngle += 1.5 * dt; // Rotates
  if (state.scannerAngle > Math.PI * 2) {
    state.scannerAngle -= Math.PI * 2;
  }

  // Update Particles (Brownian-ish motion around base)
  for (const p of state.particles) {
    const timeScale = state.time * 0.5;
    // Simple harmonic motion + noise simulation
    p.pos.x = p.baseX + Math.sin(timeScale + p.noiseOffset) * 20;
    p.pos.y = p.baseY + Math.cos(timeScale * 0.8 + p.noiseOffset) * 20;
  }

  // Update Hotspots
  for (const h of state.hotspots) {
    h.pulsePhase += dt * 2;
    // Breathing effect
    h.radius = h.baseRadius + Math.sin(h.pulsePhase) * 10;
    
    // Check intersection with scanner angle to "activate" intensity
    const dx = h.pos.x - state.width / 2;
    const dy = h.pos.y - state.height / 2;
    const angle = Math.atan2(dy, dx); 
    // Normalize angle to 0-2PI to match scanner
    let normalizedAngle = angle;
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    
    // Scanner wedge width is approx 0.2 radians
    // Check if scanner is passing over
    let angleDiff = Math.abs(normalizedAngle - state.scannerAngle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

    if (angleDiff < 0.2) {
      h.intensity = Math.min(h.intensity + dt * 5, 1);
    } else {
      h.intensity = Math.max(h.intensity - dt * 0.5, 0); // Decay
    }
  }
}
