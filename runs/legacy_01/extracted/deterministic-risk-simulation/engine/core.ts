import { SimState, initState } from './state';
import { updatePhysics } from './systems';
import { draw } from './render';
import { EngineParams } from '../config/params';

export class SimulationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: SimState;
  private rafId: number | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private seed: number;

  constructor(canvas: HTMLCanvasElement, seed: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.seed = seed;

    // Initial Resize
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // Init State
    this.state = initState(seed, width, height);
  }

  public start() {
    if (this.rafId) return;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.state.width = width;
    this.state.height = height;
    // Note: We don't re-init state on resize to preserve continuity,
    // just update bounds. Systems handle bounds checking.
  }

  private loop = (timestamp: number) => {
    // Determine elapsed time
    let frameTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Cap frameTime to avoid spiral of death on slow devices
    if (frameTime > 0.25) frameTime = 0.25;

    this.accumulator += frameTime;

    // Fixed timestep update
    while (this.accumulator >= EngineParams.TIME_STEP) {
      updatePhysics(this.state);
      this.accumulator -= EngineParams.TIME_STEP;
    }

    // Render
    draw(this.ctx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };
}