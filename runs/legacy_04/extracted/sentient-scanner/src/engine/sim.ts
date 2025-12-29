import { random } from './rng';

export interface Point {
    x: number;
    y: number;
}

export interface Cluster {
    x: number;
    y: number;
    color: string;
    radius: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    clusterIndex: number;
    life: number;
}

export interface Hotspot {
    x: number;
    y: number;
    strength: number; // positive = attract, negative = repulse
    radius: number;
}

export interface SimState {
    width: number;
    height: number;
    stepCount: number;
    clusters: Cluster[];
    particles: Particle[];
    hotspots: Hotspot[];
    scanRadius: number;
    duration: number; // in seconds
}

const COLORS = ['#00ffcc', '#ff00ff', '#ffff00', '#00ccff', '#ff3333', '#cc00cc', '#33ff33'];

export function initSim(width: number, height: number): SimState {
    const clusterCount = 4 + Math.floor(random() * 4); // 4-7
    const clusters: Cluster[] = [];
    
    // Generate Clusters
    for (let i = 0; i < clusterCount; i++) {
        clusters.push({
            x: width * 0.2 + random() * width * 0.6,
            y: height * 0.2 + random() * height * 0.6,
            color: COLORS[i % COLORS.length],
            radius: 20 + random() * 30
        });
    }

    // Generate Hotspots (6-10)
    const hotspotCount = 6 + Math.floor(random() * 5);
    const hotspots: Hotspot[] = [];
    for (let i = 0; i < hotspotCount; i++) {
        hotspots.push({
            x: random() * width,
            y: random() * height,
            strength: (random() > 0.5 ? 1 : -1) * (50 + random() * 100),
            radius: 50 + random() * 50
        });
    }

    // Generate Particles (200-400)
    const particleCount = 200 + Math.floor(random() * 201);
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
        const clusterIndex = Math.floor(random() * clusterCount);
        const cluster = clusters[clusterIndex];
        const angle = random() * Math.PI * 2;
        const dist = random() * cluster.radius * 2;
        particles.push({
            x: cluster.x + Math.cos(angle) * dist,
            y: cluster.y + Math.sin(angle) * dist,
            vx: (random() - 0.5) * 2,
            vy: (random() - 0.5) * 2,
            clusterIndex,
            life: random()
        });
    }

    return {
        width,
        height,
        stepCount: 0,
        clusters,
        particles,
        hotspots,
        scanRadius: 0,
        duration: 18
    };
}

export function updateSim(state: SimState, dt: number) {
    state.stepCount++;
    
    // Scan ring progression (0 to max dimension in 18s)
    const maxRadius = Math.sqrt(state.width * state.width + state.height * state.height);
    state.scanRadius = (state.scanRadius + (maxRadius / (state.duration * 60))) % maxRadius;

    // Pulse hotspots logic
    const time = state.stepCount * dt;

    // Update particles
    for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        const cluster = state.clusters[p.clusterIndex];

        // 1. Attraction to own cluster
        const dx = cluster.x - p.x;
        const dy = cluster.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        // Spring force to cluster
        const k = 0.5; // spring constant
        const ax = dx * k * dt;
        const ay = dy * k * dt;

        p.vx += ax;
        p.vy += ay;

        // 2. Influence from hotspots
        for (let j = 0; j < state.hotspots.length; j++) {
            const h = state.hotspots[j];
            const hdx = h.x - p.x;
            const hdy = h.y - p.y;
            const hDistSq = hdx * hdx + hdy * hdy;
            const hDist = Math.sqrt(hDistSq);

            if (hDist < h.radius * 2) {
                // Determine force based on deterministic time pulse
                // "Hotspots should influence particles via attract/repulse forces"
                // Modulate strength with time to make it dynamic
                const pulse = Math.sin(time * 2 + j); 
                const force = (h.strength * pulse) / (hDist + 1);
                
                // Normalized direction
                const nx = hdx / hDist;
                const ny = hdy / hDist;

                p.vx += nx * force * dt;
                p.vy += ny * force * dt;
            }
        }

        // 3. Scan ring agitation
        // If particle is near scan ring, jitter it
        const distFromCenter = Math.sqrt((p.x - state.width/2)**2 + (p.y - state.height/2)**2);
        if (Math.abs(distFromCenter - state.scanRadius) < 20) {
            p.vx += (random() - 0.5) * 50 * dt;
            p.vy += (random() - 0.5) * 50 * dt;
            p.life = 1.0; // brighten up
        }

        // Apply Velocity
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Particle Life/Blink
        p.life -= dt * 0.5;
        if (p.life <= 0) p.life = 1;
    }

    // Move Clusters slightly deterministically
    for (let i = 0; i < state.clusters.length; i++) {
        state.clusters[i].x += Math.sin(time * 0.5 + i) * 0.2;
        state.clusters[i].y += Math.cos(time * 0.3 + i) * 0.2;
    }
}