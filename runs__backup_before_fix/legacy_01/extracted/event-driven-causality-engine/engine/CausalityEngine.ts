
import { 
  CausalityEventType, 
  CausalityEvent, 
  EngineParams, 
  ParticleState, 
  TimelineState 
} from '../types';
import { EVENT_TIMELINE, TIMELINE_DURATION, PARTICLE_COUNT, SEED } from '../constants';
import { DeterministicRNG } from '../utils/rng';

export class CausalityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleState[] = [];
  private rng: DeterministicRNG;
  private startTime: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private rafId: number = 0;

  // Parameters updated every frame based on the timeline
  private currentParams: EngineParams = { ...EVENT_TIMELINE[0].params };
  private activeEvent: CausalityEvent = EVENT_TIMELINE[0];
  private timelineProgress: number = 0;

  // Callbacks for UI sync (not high frequency)
  public onTimelineUpdate?: (state: TimelineState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.rng = new DeterministicRNG(SEED);
    this.initParticles();
  }

  private initParticles() {
    this.particles = [];
    const { width, height } = this.canvas;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        x: this.rng.nextRange(0, width),
        y: this.rng.nextRange(0, height),
        vx: this.rng.nextRange(-1, 1),
        vy: this.rng.nextRange(-1, 1),
        life: this.rng.next()
      });
    }
  }

  public start() {
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;

    const elapsedTotal = (time - this.startTime) / 1000;
    const currentTimeInLoop = elapsedTotal % TIMELINE_DURATION;
    
    this.updateTimeline(currentTimeInLoop);
    this.updatePhysics();
    this.draw();

    this.lastTime = time;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateTimeline(currentTime: number) {
    // Find active event
    const active = EVENT_TIMELINE.find(e => 
      currentTime >= e.startTime && currentTime < (e.startTime + e.duration)
    ) || EVENT_TIMELINE[EVENT_TIMELINE.length - 1];

    if (active !== this.activeEvent) {
      this.activeEvent = active;
    }

    // Linear interpolation for smooth transitions could be here, 
    // but for "Event-driven" we'll stick to discrete or slightly smoothed jumps
    this.currentParams = active.params;
    this.timelineProgress = currentTime / TIMELINE_DURATION;

    // Trigger UI update once every few frames (simplified check)
    if (this.onTimelineUpdate) {
      this.onTimelineUpdate({
        currentTime,
        activeEvent: this.activeEvent,
        progress: this.timelineProgress
      });
    }
  }

  private updatePhysics() {
    const { width, height } = this.canvas;
    const { k, friction, hotspotIntensity } = this.currentParams;

    // Fixed time step for determinism? We'll assume roughly 60fps for this visual demo
    for (const p of this.particles) {
      // Hotspots (only during Shock)
      if (hotspotIntensity > 0) {
        // Create 3 deterministic hotspots based on seed and time
        for (let i = 0; i < 3; i++) {
          const hX = (width * 0.5) + Math.cos(this.startTime * 0.001 + i) * width * 0.3;
          const hY = (height * 0.5) + Math.sin(this.startTime * 0.001 + i) * height * 0.3;
          
          const dx = hX - p.x;
          const dy = hY - p.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          if (dist < 300) {
            const force = (1 - dist / 300) * hotspotIntensity;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
      }

      // Basic motion
      p.x += p.vx;
      p.y += p.vy;

      // Friction
      p.vx *= friction;
      p.vy *= friction;

      // Boundaries
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > height) { p.y = height; p.vy *= -1; }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    const { threshold, hue, bloom } = this.currentParams;

    // Trail effect (fade background)
    this.ctx.fillStyle = `rgba(2, 6, 23, ${this.activeEvent.type === CausalityEventType.SHOCK ? 0.15 : 0.3})`;
    this.ctx.fillRect(0, 0, width, height);

    // Threads (lines between particles)
    this.ctx.lineWidth = 0.5;
    
    // Performance optimization: only check subset of neighbors or use grid if count was high
    // Here 300 is small enough for O(N^2) if needed, but let's be smart
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      
      // Draw point
      this.ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.8)`;
      this.ctx.beginPath();
      this.ctx.arc(p1.x, p1.y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < threshold * threshold) {
          const dist = Math.sqrt(distSq);
          const opacity = 1 - (dist / threshold);
          this.ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${opacity * 0.4})`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();

          // Attraction force (the 'k' in causality)
          const force = (threshold - dist) * this.currentParams.k * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          p1.vx -= fx;
          p1.vy -= fy;
          p2.vx += fx;
          p2.vy += fy;
        }
      }
    }

    // Hotspot Visuals (Shock Glow)
    if (this.activeEvent.type === CausalityEventType.SHOCK) {
      this.ctx.shadowBlur = bloom;
      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
    } else {
      this.ctx.shadowBlur = 0;
    }
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initParticles();
  }
}
