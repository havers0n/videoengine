import { Particle, SimulationConfig, Vector2 } from '../types';
import { SeededRNG } from '../utils/rng';

export class PhysicsEngine {
  public particles: Particle[] = [];
  public width: number = 0;
  public height: number = 0;
  
  // Spatial Hash Grid
  private grid: Particle[][][] = [];
  private cols: number = 0;
  private rows: number = 0;
  private cellSize: number = 80;

  // Cluster Centers (Hotspots)
  private clusterCenters: Vector2[] = [];
  private clusterColors: string[] = [];
  
  private rng: SeededRNG;
  private config: SimulationConfig;

  constructor(seed: number, config: SimulationConfig) {
    this.rng = new SeededRNG(seed);
    this.config = config;
    this.generateClusterColors();
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.initGrid();
  }

  private generateClusterColors() {
    // Generate distinct neon colors for clusters
    const hues = [0, 45, 120, 180, 240, 280, 320, 15, 150, 200];
    this.clusterColors = Array.from({ length: this.config.clusterCount }, (_, i) => {
        const hue = hues[i % hues.length];
        return `hsl(${hue}, 100%, 60%)`;
    });
  }

  private initGrid() {
    this.cellSize = this.config.connectionDistance;
    this.cols = Math.ceil(this.width / this.cellSize);
    this.rows = Math.ceil(this.height / this.cellSize);
    
    // Pre-allocate grid
    this.grid = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      this.grid[x] = new Array(this.rows);
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y] = [];
      }
    }
  }

  private clearGrid() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y].length = 0; // Clear array without reallocation
      }
    }
  }

  initParticles() {
    this.particles = [];
    this.clusterCenters = [];

    // Initialize cluster centers
    for (let i = 0; i < this.config.clusterCount; i++) {
      this.clusterCenters.push({
        x: this.rng.range(this.width * 0.1, this.width * 0.9),
        y: this.rng.range(this.height * 0.1, this.height * 0.9)
      });
    }

    // Initialize particles
    for (let i = 0; i < this.config.particleCount; i++) {
      const clusterId = Math.floor(this.rng.next() * this.config.clusterCount);
      const center = this.clusterCenters[clusterId];
      
      // Spawn around cluster center
      const angle = this.rng.next() * Math.PI * 2;
      const dist = this.rng.range(0, 100);

      this.particles.push({
        id: i,
        pos: {
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
        },
        vel: {
          x: this.rng.range(-1, 1),
          y: this.rng.range(-1, 1),
        },
        acc: { x: 0, y: 0 },
        clusterId,
        radius: this.rng.range(2, 4),
        baseSpeed: this.rng.range(0.5, 1.5)
      });
    }
  }

  // Determine grid cell index
  private getGridPos(p: Particle): { x: number, y: number } {
    const x = Math.floor(p.pos.x / this.cellSize);
    const y = Math.floor(p.pos.y / this.cellSize);
    return {
      x: Math.max(0, Math.min(x, this.cols - 1)),
      y: Math.max(0, Math.min(y, this.rows - 1))
    };
  }

  update(dt: number) {
    // 1. Clear and Populate Spatial Hash
    this.clearGrid();
    for (const p of this.particles) {
      const cell = this.getGridPos(p);
      this.grid[cell.x][cell.y].push(p);
    }

    // Move cluster centers slowly (Wandering Hotspots)
    const time = performance.now() * 0.0005;
    for (let i = 0; i < this.clusterCenters.length; i++) {
        const center = this.clusterCenters[i];
        center.x += Math.cos(time + i) * 0.5;
        center.y += Math.sin(time + i * 2) * 0.5;
        
        // Keep centers in bounds
        if (center.x < 100) center.x += 1;
        if (center.x > this.width - 100) center.x -= 1;
        if (center.y < 100) center.y += 1;
        if (center.y > this.height - 100) center.y -= 1;
    }

    // 2. Physics Pass
    for (const p of this.particles) {
      // Reset acceleration
      p.acc.x = 0;
      p.acc.y = 0;

      // Force A: Pull to cluster center (Cohesion to hotspot)
      const center = this.clusterCenters[p.clusterId];
      const dxC = center.x - p.pos.x;
      const dyC = center.y - p.pos.y;
      const distC = Math.sqrt(dxC * dxC + dyC * dyC);
      if (distC > 0) {
          const strength = 0.05; // Gentle pull
          p.acc.x += (dxC / distC) * strength;
          p.acc.y += (dyC / distC) * strength;
      }

      // Force B: Interactions via Grid
      const cell = this.getGridPos(p);
      const startX = Math.max(0, cell.x - 1);
      const endX = Math.min(this.cols - 1, cell.x + 1);
      const startY = Math.max(0, cell.y - 1);
      const endY = Math.min(this.rows - 1, cell.y + 1);

      for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
          const neighbors = this.grid[gx][gy];
          for (const other of neighbors) {
            if (p.id === other.id) continue;

            const dx = other.pos.x - p.pos.x;
            const dy = other.pos.y - p.pos.y;
            const distSq = dx * dx + dy * dy;
            
            // Avoid singularity and super long range
            if (distSq < this.cellSize * this.cellSize && distSq > 0.1) {
              const dist = Math.sqrt(distSq);
              
              if (p.clusterId === other.clusterId) {
                // Intra-cluster: Attraction (Spring-like)
                // Normalize force to distance
                const force = (dist - 30) * this.config.clusterAttraction; // Equilibrium at 30px
                p.acc.x += (dx / dist) * force;
                p.acc.y += (dy / dist) * force;
              } else {
                // Inter-cluster: Repulsion
                const force = -this.config.globalRepulsion * 500 / distSq;
                p.acc.x += (dx / dist) * force;
                p.acc.y += (dy / dist) * force;
              }
            }
          }
        }
      }

      // 3. Integration (Euler)
      p.vel.x += p.acc.x * dt;
      p.vel.y += p.acc.y * dt;

      // Friction
      p.vel.x *= this.config.friction;
      p.vel.y *= this.config.friction;

      // Update Pos
      p.pos.x += p.vel.x * 60 * dt; // Scale velocity for 60fps unit feel
      p.pos.y += p.vel.y * 60 * dt;

      // Wall Bounce
      if (p.pos.x < 0) { p.pos.x = 0; p.vel.x *= -1; }
      if (p.pos.x > this.width) { p.pos.x = this.width; p.vel.x *= -1; }
      if (p.pos.y < 0) { p.pos.y = 0; p.vel.y *= -1; }
      if (p.pos.y > this.height) { p.pos.y = this.height; p.vel.y *= -1; }
    }
  }

  // Separate draw method to decouple logic from view
  draw(ctx: CanvasRenderingContext2D, alpha: number) {
    // Note: alpha (interpolation factor) is not strictly used here for pos
    // because we are doing a heavy simulation where direct state render is fine for visualizer
    
    // Draw Connections (Threads)
    // Only draw connections for nearby particles in grid to keep rendering O(N)
    ctx.lineWidth = 1;
    
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            const cellParticles = this.grid[x][y];
            
            // Check this cell and neighbors for drawing lines
            // Only check "forward" neighbors to avoid double drawing lines
            // (Right, Bottom-Left, Bottom, Bottom-Right)
            const neighborOffsets = [[1, 0], [-1, 1], [0, 1], [1, 1]];

            for (const p of cellParticles) {
                 // Check against own cell (triangle check to avoid double)
                 for (const other of cellParticles) {
                     if (p.id < other.id) { // Draw once
                        this.drawThread(ctx, p, other);
                     }
                 }

                 // Check neighbor cells
                 for (const [ox, oy] of neighborOffsets) {
                     const nx = x + ox;
                     const ny = y + oy;
                     if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                         for (const other of this.grid[nx][ny]) {
                             this.drawThread(ctx, p, other);
                         }
                     }
                 }
            }
        }
    }

    // Draw Particles
    for (const p of this.particles) {
        ctx.fillStyle = this.clusterColors[p.clusterId];
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.clusterColors[p.clusterId];
        
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw Hotspots (Cluster Centers) faintly
    ctx.shadowBlur = 40;
    for (let i = 0; i < this.clusterCenters.length; i++) {
        ctx.fillStyle = this.clusterColors[i];
        ctx.globalAlpha = 0.05;
        const c = this.clusterCenters[i];
        ctx.beginPath();
        ctx.arc(c.x, c.y, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    ctx.shadowBlur = 0;
  }

  private drawThread(ctx: CanvasRenderingContext2D, p1: Particle, p2: Particle) {
      // Only draw thread if same cluster or very close
      const dx = p1.pos.x - p2.pos.x;
      const dy = p1.pos.y - p2.pos.y;
      const distSq = dx * dx + dy * dy;
      const maxDist = this.cellSize * this.cellSize;

      if (distSq < maxDist) {
          const dist = Math.sqrt(distSq);
          const opacity = 1 - (dist / this.cellSize);
          
          if (opacity > 0) {
              ctx.strokeStyle = p1.clusterId === p2.clusterId 
                ? this.clusterColors[p1.clusterId]
                : 'rgba(255, 255, 255, 0.2)'; // Weak white link for diff clusters
              
              ctx.globalAlpha = opacity * 0.5;
              ctx.beginPath();
              ctx.moveTo(p1.pos.x, p1.pos.y);
              ctx.lineTo(p2.pos.x, p2.pos.y);
              ctx.stroke();
              ctx.globalAlpha = 1.0;
          }
      }
  }
}