import { EngineConfig, Particle, Vector2, RenderStats } from './types';
import { addInPlace, lengthSq, lerpVector, scaleInPlace, sub } from './VectorMath';

export class SimulationEngine {
  private particles: Particle[] = [];
  private config: EngineConfig;
  private width: number = 0;
  private height: number = 0;
  
  // Timing variables
  private accumulator: number = 0;
  private lastTime: number = 0;
  private readonly FIXED_TIMESTEP = 1 / 60; // 60 physics updates per second
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  // Performance monitoring
  private lastFpsUpdate: number = 0;
  private frameCount: number = 0;
  public stats: RenderStats = { fps: 0, particleCount: 0, physicsTime: 0 };

  constructor(config: EngineConfig) {
    this.config = config;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.particles.length === 0) {
      this.initParticles();
    }
  }

  public updateConfig(newConfig: EngineConfig) {
    const prevCount = this.config.particleCount;
    this.config = newConfig;
    if (newConfig.particleCount !== prevCount) {
      this.initParticles();
    }
  }

  // Deterministic initialization using Fermat's Spiral
  public initParticles() {
    this.particles = [];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.3999 radians

    for (let i = 0; i < this.config.particleCount; i++) {
      // Deterministic math for position
      const r = 10 * Math.sqrt(i + 1); // Spacing
      const theta = i * goldenAngle;

      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;

      // Deterministic colors based on index
      const hue = (i * 2) % 360;
      const color = `hsla(${hue}, 70%, 60%, 0.8)`;

      const p: Particle = {
        id: i,
        position: { x, y },
        prevPosition: { x, y },
        velocity: { x: 0, y: 0 }, // Start stationary
        mass: 1 + (i % 3) * 0.5, // Deterministic mass variation
        color,
      };

      this.particles.push(p);
    }
    this.stats.particleCount = this.particles.length;
  }

  private integrate(dt: number) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const center = { x: cx, y: cy };
    const { gravityStrength, damping, swirlStrength } = this.config;

    // Semi-implicit Euler integration
    for (const p of this.particles) {
      // Save previous position for interpolation
      p.prevPosition.x = p.position.x;
      p.prevPosition.y = p.position.y;

      // 1. Calculate Forces
      
      // Vector from center to particle
      const dx = p.position.x - cx;
      const dy = p.position.y - cy;
      const distSq = dx * dx + dy * dy;
      
      // Softening parameter to prevent infinity at center
      const softening = 1000;
      const dist = Math.sqrt(distSq + softening);

      // Normalized direction * Force Magnitude
      // Gravity: pulls towards center (negative)
      const forceMag = (gravityStrength * p.mass) / (distSq + softening);
      
      const fx = -forceMag * (dx / dist);
      const fy = -forceMag * (dy / dist);

      // Swirl Force: Tangential to the radius
      // Perpendicular vector (-y, x)
      const sx = -dy / dist;
      const sy = dx / dist;
      
      const swirlX = sx * (swirlStrength / dist);
      const swirlY = sy * (swirlStrength / dist);

      // 2. Update Velocity
      // a = F / m
      const ax = (fx + swirlX) / p.mass;
      const ay = (fy + swirlY) / p.mass;

      p.velocity.x += ax * dt;
      p.velocity.y += ay * dt;

      // Damping
      p.velocity.x *= damping;
      p.velocity.y *= damping;

      // 3. Update Position
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;

      // 4. Boundary bounce (Deterministic)
      if (p.position.x < 0) { p.position.x = 0; p.velocity.x *= -1; }
      if (p.position.x > this.width) { p.position.x = this.width; p.velocity.x *= -1; }
      if (p.position.y < 0) { p.position.y = 0; p.velocity.y *= -1; }
      if (p.position.y > this.height) { p.position.y = this.height; p.velocity.y *= -1; }
    }
  }

  private render(ctx: CanvasRenderingContext2D, alpha: number) {
    // Clear canvas
    ctx.fillStyle = '#020617'; // Deep slate background
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid lines (Visual fluff)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < this.width; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, this.height); }
    for (let y = 0; y < this.height; y += 100) { ctx.moveTo(0, y); ctx.lineTo(this.width, y); }
    ctx.stroke();

    // Draw Particles
    for (const p of this.particles) {
      // Interpolate position for smooth rendering between physics steps
      const renderPos = lerpVector(p.prevPosition, p.position, alpha);

      ctx.fillStyle = p.color;
      ctx.beginPath();
      const size = Math.max(1, p.mass * 1.5);
      ctx.arc(renderPos.x, renderPos.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public start(ctx: CanvasRenderingContext2D) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    
    const loop = (timestamp: number) => {
      if (!this.isRunning) return;

      // Calculate delta time in seconds
      let frameTime = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      // Cap frame time to avoid spiral of death on lag spikes
      if (frameTime > 0.25) frameTime = 0.25;

      this.accumulator += frameTime * this.config.timeScale;

      const physicsStart = performance.now();

      // Fixed Timestep Loop
      while (this.accumulator >= this.FIXED_TIMESTEP) {
        this.integrate(this.FIXED_TIMESTEP);
        this.accumulator -= this.FIXED_TIMESTEP;
      }
      
      const physicsEnd = performance.now();
      this.stats.physicsTime = physicsEnd - physicsStart;

      // Calculate alpha for interpolation (0.0 to 1.0)
      const alpha = this.accumulator / this.FIXED_TIMESTEP;

      this.render(ctx, alpha);

      // FPS Calculation
      this.frameCount++;
      if (timestamp - this.lastFpsUpdate >= 1000) {
        this.stats.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsUpdate = timestamp;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset() {
    this.initParticles();
    // Reset velocities
    this.particles.forEach(p => {
        p.velocity.x = 0;
        p.velocity.y = 0;
    });
  }

  public isEngineRunning() {
    return this.isRunning;
  }
}