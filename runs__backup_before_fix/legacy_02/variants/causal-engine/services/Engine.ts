import { Entity, HistoryFrame, SimulationConfig, Vector2 } from '../types';
import { RNG, Vec2 } from './mathUtils';

export class Engine {
  public entities: Entity[] = [];
  public history: HistoryFrame[] = [];
  public tickCount: number = 0;
  public config: SimulationConfig;
  private rng: RNG;
  
  // Performance metrics
  public lastTickTime: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.rng = new RNG(config.seed);
    this.reset();
  }

  public reset() {
    this.tickCount = 0;
    this.history = [];
    this.entities = [];
    this.rng = new RNG(this.config.seed);

    // Initialize entities randomly
    for (let i = 0; i < this.config.entityCount; i++) {
      this.entities.push({
        id: i,
        position: {
          x: this.rng.nextRange(100, 700),
          y: this.rng.nextRange(100, 500),
        },
        velocity: {
          x: this.rng.nextRange(-1, 1),
          y: this.rng.nextRange(-1, 1),
        },
        acceleration: { x: 0, y: 0 },
        radius: 4,
        color: `hsl(${this.rng.nextRange(160, 220)}, 80%, 60%)`,
      });
    }

    // Save initial state
    this.recordHistory();
  }

  public updateConfig(newConfig: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...newConfig };
    // Truncate history if buffer size reduced
    if (this.history.length > this.config.historyLength) {
      this.history = this.history.slice(this.history.length - this.config.historyLength);
    }
  }

  // The Fixed Timestep Update
  public tick(width: number, height: number) {
    const start = performance.now();
    this.tickCount++;

    const nextEntities = this.entities.map(entity => {
      // 1. Calculate Behaviors based on HISTORICAL data (Causality)
      const flockingForce = this.calculateFlocking(entity, width, height);
      
      // 2. Physics Integration
      let acc = flockingForce;
      acc = Vec2.limit(acc, this.config.maxForce);
      
      const vel = Vec2.limit(Vec2.add(entity.velocity, acc), this.config.maxSpeed);
      let pos = Vec2.add(entity.position, vel);

      // Boundary Wrapping
      if (pos.x < 0) pos.x = width;
      if (pos.x > width) pos.x = 0;
      if (pos.y < 0) pos.y = height;
      if (pos.y > height) pos.y = 0;

      return {
        ...entity,
        velocity: vel,
        position: pos,
        acceleration: Vec2.mult(acc, 0), // Reset acc
      };
    });

    this.entities = nextEntities;
    this.recordHistory();
    this.lastTickTime = performance.now() - start;
  }

  private recordHistory() {
    const snapshot: HistoryFrame = {
      tick: this.tickCount,
      entities: this.entities.map(e => ({
        id: e.id,
        position: { ...e.position },
        velocity: { ...e.velocity }
      }))
    };

    this.history.push(snapshot);
    if (this.history.length > this.config.historyLength) {
      this.history.shift();
    }
  }

  // The Core Causal Mechanic: Looking up state from the past
  private getEntityStateAtTime(entityId: number, targetTick: number): { position: Vector2, velocity: Vector2 } | null {
    if (targetTick >= this.tickCount) {
      // Current state (instant speed of light, effectively)
      const e = this.entities.find(e => e.id === entityId);
      return e ? { position: e.position, velocity: e.velocity } : null;
    }

    // Binary search or direct index lookup if we assume contiguous history
    // Since we shift history, history[0] is the oldest kept frame.
    const oldestStoredTick = this.history[0]?.tick ?? 0;
    
    if (targetTick < oldestStoredTick) {
      // Requesting data older than memory buffer
      return null;
    }

    // Locate frame. history[i].tick should correlate.
    // Index roughly = targetTick - oldestStoredTick
    // But let's be safe with find/loop for robustness or binary search if perf needed.
    // For < 1000 items, array access is fast enough.
    
    const index = targetTick - oldestStoredTick;
    if (index >= 0 && index < this.history.length) {
         const frame = this.history[index];
         const record = frame.entities.find(e => e.id === entityId);
         return record ? { position: record.position, velocity: record.velocity } : null;
    }
    
    // Fallback: Interpolation could be added here for non-integer ticks,
    // but our simulation is discrete fixed-step.
    return null;
  }

  private calculateFlocking(me: Entity, width: number, height: number): Vector2 {
    let separation = Vec2.create();
    let alignment = Vec2.create();
    let cohesion = Vec2.create();
    let count = 0;

    for (const other of this.entities) {
      if (other.id === me.id) continue;

      // --- CAUSALITY CHECK ---
      // We do NOT check where 'other' is NOW.
      // We check where 'other' WAS when light left it to reach 'me'.
      // This is an iterative approximation because distance depends on time, and time depends on distance.
      // t_received = t_current
      // t_emitted = t_current - (distance(me(t), other(t_emitted)) / SpeedOfLight)
      
      // Approximation: Use current distance to estimate delay, then fetch past state.
      const distEstimate = Vec2.dist(me.position, other.position);
      
      // Calculate delay in ticks
      // InfoSpeed is pixels per tick. 
      const delayTicks = Math.ceil(distEstimate / this.config.informationSpeed);
      const perceivedTick = this.tickCount - delayTicks;

      // Get the state of the neighbor at that past time
      const perceivedState = this.getEntityStateAtTime(other.id, perceivedTick);

      if (!perceivedState) {
        // Signal hasn't reached yet or fell out of memory history
        continue;
      }

      // Check perception radius based on where they appear to be
      const d = Vec2.dist(me.position, perceivedState.position);

      if (d > 0 && d < this.config.perceptionRadius) {
        // Separation
        let diff = Vec2.sub(me.position, perceivedState.position);
        diff = Vec2.normalize(diff);
        diff = Vec2.div(diff, d); // Weight by distance
        separation = Vec2.add(separation, diff);

        // Alignment
        alignment = Vec2.add(alignment, perceivedState.velocity);

        // Cohesion
        cohesion = Vec2.add(cohesion, perceivedState.position);

        count++;
      }
    }

    if (count > 0) {
      // Average
      separation = Vec2.div(separation, count);
      alignment = Vec2.div(alignment, count);
      cohesion = Vec2.div(cohesion, count);

      // Implement Reynolds Steering
      // Separation
      if (Vec2.mag(separation) > 0) {
        separation = Vec2.normalize(separation);
        separation = Vec2.mult(separation, this.config.maxSpeed);
        separation = Vec2.sub(separation, me.velocity);
        separation = Vec2.limit(separation, this.config.maxForce);
      }

      // Alignment
      if (Vec2.mag(alignment) > 0) {
        alignment = Vec2.normalize(alignment);
        alignment = Vec2.mult(alignment, this.config.maxSpeed);
        alignment = Vec2.sub(alignment, me.velocity);
        alignment = Vec2.limit(alignment, this.config.maxForce);
      }

      // Cohesion
      cohesion = Vec2.sub(cohesion, me.position); // Vector to target
      if (Vec2.mag(cohesion) > 0) {
        cohesion = Vec2.normalize(cohesion);
        cohesion = Vec2.mult(cohesion, this.config.maxSpeed);
        cohesion = Vec2.sub(cohesion, me.velocity);
        cohesion = Vec2.limit(cohesion, this.config.maxForce);
      }
    }

    let force = Vec2.create();
    force = Vec2.add(force, Vec2.mult(separation, this.config.separationWeight));
    force = Vec2.add(force, Vec2.mult(alignment, this.config.alignmentWeight));
    force = Vec2.add(force, Vec2.mult(cohesion, this.config.cohesionWeight));

    return force;
  }
}
