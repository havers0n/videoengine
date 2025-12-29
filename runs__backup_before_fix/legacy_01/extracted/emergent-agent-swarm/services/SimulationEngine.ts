
import { Agent, AgentState, SimulationConfig, Vector } from '../types';
import { Vec } from '../utils';

export class SimulationEngine {
  public agents: Agent[] = [];
  public config: SimulationConfig;
  private width: number;
  private height: number;
  private grid: Map<string, Agent[]> = new Map();
  private cellSize: number;

  constructor(width: number, height: number, config: SimulationConfig) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.cellSize = config.neighborRadius;
    this.initAgents();
  }

  private initAgents() {
    this.agents = [];
    const seed = 12345;
    let currentSeed = seed;
    
    // Pseudo-random deterministic seeding
    const deterministicRandom = () => {
      currentSeed = (currentSeed * 16807) % 2147483647;
      return (currentSeed - 1) / 2147483646;
    };

    for (let i = 0; i < this.config.agentCount; i++) {
      this.agents.push({
        id: i,
        position: { 
          x: deterministicRandom() * this.width, 
          y: deterministicRandom() * this.height 
        },
        velocity: Vec.setMag(
          { x: deterministicRandom() - 0.5, y: deterministicRandom() - 0.5 },
          2
        ),
        acceleration: { x: 0, y: 0 },
        state: AgentState.IDLE,
        stress: 0,
        perceptionRadius: this.config.neighborRadius,
        maxSpeed: 3,
        maxForce: 0.1,
      });
    }
  }

  public update() {
    this.updateGrid();

    for (const agent of this.agents) {
      const neighbors = this.getNeighbors(agent);
      
      const separation = this.calculateSeparation(agent, neighbors);
      const alignment = this.calculateAlignment(agent, neighbors);
      const cohesion = this.calculateCohesion(agent, neighbors);
      const boundary = this.calculateBoundaries(agent);

      // Apply weights
      let force = { x: 0, y: 0 };
      force = Vec.add(force, Vec.mult(separation, this.config.separationWeight));
      force = Vec.add(force, Vec.mult(alignment, this.config.alignmentWeight));
      force = Vec.add(force, Vec.mult(cohesion, this.config.cohesionWeight));
      force = Vec.add(force, Vec.mult(boundary, this.config.boundaryForce));

      // Update state based on density/stress
      this.updateAgentState(agent, neighbors);

      // Physics integration
      agent.acceleration = Vec.add(agent.acceleration, force);
      
      // State modifiers
      const speedLimit = agent.state === AgentState.ALERT ? agent.maxSpeed * 1.8 : agent.maxSpeed;
      
      agent.velocity = Vec.add(agent.velocity, agent.acceleration);
      agent.velocity = Vec.limit(agent.velocity, speedLimit);
      agent.position = Vec.add(agent.position, agent.velocity);
      
      // Reset acceleration
      agent.acceleration = { x: 0, y: 0 };
    }
  }

  private updateGrid() {
    this.grid.clear();
    for (const agent of this.agents) {
      const gridX = Math.floor(agent.position.x / this.cellSize);
      const gridY = Math.floor(agent.position.y / this.cellSize);
      const key = `${gridX},${gridY}`;
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(agent);
    }
  }

  private getNeighbors(agent: Agent): Agent[] {
    const neighbors: Agent[] = [];
    const gridX = Math.floor(agent.position.x / this.cellSize);
    const gridY = Math.floor(agent.position.y / this.cellSize);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const key = `${gridX + x},${gridY + y}`;
        const cellAgents = this.grid.get(key);
        if (cellAgents) {
          for (const other of cellAgents) {
            if (other.id !== agent.id) {
              const d = Vec.dist(agent.position, other.position);
              if (d < agent.perceptionRadius) {
                neighbors.push(other);
              }
            }
          }
        }
      }
    }
    return neighbors;
  }

  private calculateSeparation(agent: Agent, neighbors: Agent[]): Vector {
    let steer = { x: 0, y: 0 };
    let count = 0;
    const separationDist = agent.perceptionRadius * 0.4;

    for (const other of neighbors) {
      const d = Vec.dist(agent.position, other.position);
      if (d > 0 && d < separationDist) {
        let diff = Vec.sub(agent.position, other.position);
        diff = Vec.normalize(diff);
        diff = Vec.div(diff, d); // Weight by distance
        steer = Vec.add(steer, diff);
        count++;
      }
    }

    if (count > 0) {
      steer = Vec.div(steer, count);
    }

    if (Vec.mag(steer) > 0) {
      steer = Vec.setMag(steer, agent.maxSpeed);
      steer = Vec.sub(steer, agent.velocity);
      steer = Vec.limit(steer, agent.maxForce);
    }

    return steer;
  }

  private calculateAlignment(agent: Agent, neighbors: Agent[]): Vector {
    let avg = { x: 0, y: 0 };
    let count = 0;

    for (const other of neighbors) {
      avg = Vec.add(avg, other.velocity);
      count++;
    }

    if (count > 0) {
      avg = Vec.div(avg, count);
      avg = Vec.setMag(avg, agent.maxSpeed);
      let steer = Vec.sub(avg, agent.velocity);
      steer = Vec.limit(steer, agent.maxForce);
      return steer;
    }

    return { x: 0, y: 0 };
  }

  private calculateCohesion(agent: Agent, neighbors: Agent[]): Vector {
    let avg = { x: 0, y: 0 };
    let count = 0;

    for (const other of neighbors) {
      avg = Vec.add(avg, other.position);
      count++;
    }

    if (count > 0) {
      avg = Vec.div(avg, count);
      let desired = Vec.sub(avg, agent.position);
      desired = Vec.setMag(desired, agent.maxSpeed);
      let steer = Vec.sub(desired, agent.velocity);
      steer = Vec.limit(steer, agent.maxForce);
      return steer;
    }

    return { x: 0, y: 0 };
  }

  private calculateBoundaries(agent: Agent): Vector {
    let steer = { x: 0, y: 0 };
    const margin = 50;

    if (agent.position.x < margin) steer.x = 1;
    else if (agent.position.x > this.width - margin) steer.x = -1;

    if (agent.position.y < margin) steer.y = 1;
    else if (agent.position.y > this.height - margin) steer.y = -1;

    if (Vec.mag(steer) > 0) {
      steer = Vec.setMag(steer, agent.maxSpeed);
      steer = Vec.sub(steer, agent.velocity);
      steer = Vec.limit(steer, agent.maxForce * 1.5);
    }
    return steer;
  }

  private updateAgentState(agent: Agent, neighbors: Agent[]) {
    // Stress calculation: Higher if too many neighbors or neighbors are alert
    const neighborStress = neighbors.reduce((acc, n) => acc + (n.state === AgentState.ALERT ? 0.2 : 0.05), 0);
    
    if (neighborStress > this.config.stressThreshold) {
      agent.stress = Math.min(1, agent.stress + 0.1);
    } else {
      agent.stress = Math.max(0, agent.stress - this.config.stressDecay);
    }

    if (agent.stress > 0.8) {
      agent.state = AgentState.ALERT;
    } else if (agent.stress < 0.2) {
      agent.state = AgentState.IDLE;
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
