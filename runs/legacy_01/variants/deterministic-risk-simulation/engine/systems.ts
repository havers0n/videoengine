import { SimState, Cluster, Vector2 } from './state';
import { applyForces } from './forces';
import { EngineParams } from '../config/params';

export function updateHotspots(state: SimState, dt: number) {
  const cx = state.width / 2;
  const cy = state.height / 2;

  for (const h of state.hotspots) {
    h.angle += h.speed * dt;
    // Lissajous-like movement for more organic feel
    h.pos.x = cx + Math.cos(h.angle) * h.orbitRadius;
    h.pos.y = cy + Math.sin(h.angle * 1.3) * (h.orbitRadius * 0.8);
  }
}

export function integrateClusters(state: SimState, dt: number) {
  for (const c of state.clusters) {
    // Verlet / Euler integration
    c.vel.x += c.acc.x * dt;
    c.vel.y += c.acc.y * dt;

    // Damping
    c.vel.x *= EngineParams.DAMPING;
    c.vel.y *= EngineParams.DAMPING;

    c.pos.x += c.vel.x * dt;
    c.pos.y += c.vel.y * dt;

    // Bounds (Bounce)
    const margin = EngineParams.CLUSTER_RADIUS;
    if (c.pos.x < margin) { c.pos.x = margin; c.vel.x *= -1; }
    if (c.pos.x > state.width - margin) { c.pos.x = state.width - margin; c.vel.x *= -1; }
    if (c.pos.y < margin) { c.pos.y = margin; c.vel.y *= -1; }
    if (c.pos.y > state.height - margin) { c.pos.y = state.height - margin; c.vel.y *= -1; }
  }
}

export function updatePhysics(state: SimState) {
  const dt = EngineParams.TIME_STEP;
  
  // 1. Move fields
  updateHotspots(state, dt);

  // 2. Calculate Forces
  applyForces(state);

  // 3. Move Clusters
  integrateClusters(state, dt);

  // 4. Update Time
  state.time += dt;
  state.frameCount++;
}