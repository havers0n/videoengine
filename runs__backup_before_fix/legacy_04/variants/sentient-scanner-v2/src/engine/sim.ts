import { mulberry32, SEED } from './rng';

export interface Vector2 { x: number; y: number; }
export interface Particle { pos: Vector2; vel: Vector2; color: string; life: number; }
export interface Cluster { pos: Vector2; mass: number; id: number; color: string; }
export interface Hotspot { pos: Vector2; strength: number; radius: number; type: 'attract' | 'repulse'; }

export interface State {
    particles: Particle[];
    clusters: Cluster[];
    hotspots: Hotspot[];
    width: number;
    height: number;
    stepCount: number;
    scanRadius: number;
}

const rand = mulberry32(SEED);

export function initSimulation(width: number, height: number): State {
    const clusters: Cluster[] = [];
    // 4-7 clusters
    const numClusters = 4 + Math.floor(rand() * 4); 
    const colors = ['#00f0ff', '#ff00aa', '#bc13fe', '#4d4dff', '#00ff99'];

    for(let i=0; i<numClusters; i++) {
        clusters.push({
            pos: { x: width * 0.15 + rand() * width * 0.7, y: height * 0.15 + rand() * height * 0.7 },
            mass: 30 + rand() * 40,
            id: i,
            color: colors[Math.floor(rand() * colors.length)]
        });
    }

    const particles: Particle[] = [];
    // 200-400 particles
    const numParticles = 350;
    for(let i=0; i<numParticles; i++) {
        particles.push({
            pos: { x: rand() * width, y: rand() * height },
            vel: { x: (rand() - 0.5) * 2, y: (rand() - 0.5) * 2 },
            color: '#e2e8f0', // slate-200
            life: rand()
        });
    }

    const hotspots: Hotspot[] = [];
    // 6-10 hotspots
    const numHotspots = 8;
    for(let i=0; i<numHotspots; i++) {
        hotspots.push({
            pos: { x: rand() * width, y: rand() * height },
            strength: (rand() - 0.5) * 0.8,
            radius: 80 + rand() * 120,
            type: rand() > 0.5 ? 'attract' : 'repulse'
        });
    }

    return {
        particles,
        clusters,
        hotspots,
        width,
        height,
        stepCount: 0,
        scanRadius: 0
    };
}

export function updateSimulation(state: State, dt: number) {
    state.stepCount++;
    
    // Update scan ring
    state.scanRadius += dt * 300;
    const maxDim = Math.max(state.width, state.height);
    if (state.scanRadius > maxDim * 1.2) {
        state.scanRadius = 0;
    }

    // Update Particles
    for (let p of state.particles) {
        let fx = 0, fy = 0;

        // Cluster gravity
        for (let c of state.clusters) {
            const dx = c.pos.x - p.pos.x;
            const dy = c.pos.y - p.pos.y;
            const distSq = dx*dx + dy*dy;
            const dist = Math.sqrt(distSq);
            
            // Avoid singularity
            if (dist > 10) {
                // Soft gravity
                const f = (c.mass * 100) / (distSq + 1000); 
                fx += (dx / dist) * f;
                fy += (dy / dist) * f;
            }
        }

        // Hotspots influence
        for (let h of state.hotspots) {
             const dx = h.pos.x - p.pos.x;
             const dy = h.pos.y - p.pos.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < h.radius) {
                 const factor = (1 - dist / h.radius) * Math.abs(h.strength) * 15;
                 if (h.type === 'attract') {
                     fx += (dx/dist) * factor;
                     fy += (dy/dist) * factor;
                 } else {
                     fx -= (dx/dist) * factor;
                     fy -= (dy/dist) * factor;
                 }
             }
        }

        // Apply forces
        p.vel.x += fx * dt;
        p.vel.y += fy * dt;
        
        // Damping/Friction
        p.vel.x *= 0.96;
        p.vel.y *= 0.96;

        // Movement
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;

        // Wrap around boundaries
        if (p.pos.x < 0) p.pos.x = state.width;
        if (p.pos.x > state.width) p.pos.x = 0;
        if (p.pos.y < 0) p.pos.y = state.height;
        if (p.pos.y > state.height) p.pos.y = 0;
    }
}