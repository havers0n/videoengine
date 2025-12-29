import { Point, Constraint, WorldState, SimulationConfig } from '../types';
import { createRNG } from '../utils/rng';

const rng = createRNG(5678);

export const createWorld = (width: number, height: number, config: SimulationConfig): WorldState => {
  const points: Point[] = [];
  const constraints: Constraint[] = [];
  
  // Initialize points in a grid-like or random distribution
  for (let i = 0; i < config.pointCount; i++) {
    const x = width * 0.1 + rng() * width * 0.8;
    const y = height * 0.1 + rng() * height * 0.8;
    
    points.push({
      id: i,
      x,
      y,
      oldX: x - (rng() - 0.5) * 2, // Initial tiny velocity
      oldY: y - (rng() - 0.5) * 2,
      vx: 0,
      vy: 0,
      pinned: false,
      color: `hsl(${200 + rng() * 60}, 100%, 70%)`,
      radius: 2 + rng() * 3
    });
  }

  return {
    points,
    constraints,
    width,
    height,
    mouse: { x: 0, y: 0 },
    isMouseDown: false,
    time: 0
  };
};

export const updatePhysics = (world: WorldState, dt: number, config: SimulationConfig) => {
  const { points, constraints, width, height, mouse, isMouseDown } = world;
  
  // 1. Verlet Integration
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.pinned) continue;

    const vx = (p.x - p.oldX) * config.friction;
    const vy = (p.y - p.oldY) * config.friction;

    p.oldX = p.x;
    p.oldY = p.y;

    p.x += vx;
    p.y += vy;
    p.y += config.gravity * dt; // Gravity

    // Mouse Interaction (Repulsion/Attraction)
    if (isMouseDown) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      const radiusSq = config.mouseRepelRadius * config.mouseRepelRadius;
      
      if (distSq < radiusSq && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / config.mouseRepelRadius) * config.mouseRepelForce;
        // Push away
        p.x += (dx / dist) * force * dt * 50;
        p.y += (dy / dist) * force * dt * 50;
      }
    }

    // Wall Constraints (Bounce)
    const bounce = 0.9;
    if (p.x < 0) { p.x = 0; p.oldX = p.x + vx * bounce; }
    if (p.x > width) { p.x = width; p.oldX = p.x + vx * bounce; }
    if (p.y < 0) { p.y = 0; p.oldY = p.y + vy * bounce; }
    if (p.y > height) { p.y = height; p.oldY = p.y + vy * bounce; }
    
    // Update velocity cache for rendering effects if needed
    p.vx = vx;
    p.vy = vy;
  }

  // 2. Dynamic Topology (Break & Reform)
  // Reforming: O(N^2) - check for nearby neighbors to connect
  // Optimization: Only do this every few frames or check a random subset to save perf
  const connectDistSq = config.connectionDistance * config.connectionDistance;
  
  // We clean up broken constraints first
  for (let i = constraints.length - 1; i >= 0; i--) {
    const c = constraints[i];
    const dx = c.p1.x - c.p2.x;
    const dy = c.p1.y - c.p2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Breaking logic: if stretched too thin
    if (dist > c.restLength * config.breakThreshold) {
      constraints.splice(i, 1);
    }
  }

  // Reform logic (random subset to keep FPS high)
  // Try to connect points that are close
  // Limit max constraints to avoid clutter?
  // Let's iterate a seeded random offset
  const stepOffset = Math.floor(world.time) % points.length;
  for (let i = 0; i < points.length; i++) {
     // Only check a subset per frame
     if ((i + stepOffset) % 2 !== 0) continue; 

     const p1 = points[i];
     // Find nearest neighbor that isn't connected
     for (let j = i + 1; j < points.length; j++) {
       const p2 = points[j];
       const dx = p1.x - p2.x;
       const dy = p1.y - p2.y;
       const distSq = dx * dx + dy * dy;

       if (distSq < connectDistSq) {
          // Check if already connected
          const exists = constraints.some(c => (c.p1 === p1 && c.p2 === p2) || (c.p1 === p2 && c.p2 === p1));
          if (!exists) {
            const dist = Math.sqrt(distSq);
            constraints.push({
              p1,
              p2,
              restLength: dist,
              stiffness: config.stiffness,
              breakingThreshold: config.breakThreshold
            });
          }
       }
     }
  }

  // 3. Constraint Solving (Iterative)
  const iterations = 3;
  for (let k = 0; k < iterations; k++) {
    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[i];
      const dx = c.p2.x - c.p1.x;
      const dy = c.p2.y - c.p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist === 0) continue;

      const diff = (dist - c.restLength) / dist;
      const offsetX = dx * diff * 0.5 * c.stiffness;
      const offsetY = dy * diff * 0.5 * c.stiffness;

      if (!c.p1.pinned) {
        c.p1.x += offsetX;
        c.p1.y += offsetY;
      }
      if (!c.p2.pinned) {
        c.p2.x -= offsetX;
        c.p2.y -= offsetY;
      }
    }
  }
};