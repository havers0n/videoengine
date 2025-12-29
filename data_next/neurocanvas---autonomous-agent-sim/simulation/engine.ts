import { AgentData, AgentState, Resource, Vec2, WorldConfig, AgentConfig } from "../types";
import { SeededRNG } from "../utils/rng";

export class SimulationEngine {
  agents: AgentData[] = [];
  resources: Resource[] = [];
  tickCount: number = 0;
  rng: SeededRNG;
  config: WorldConfig;
  width: number;
  height: number;

  constructor(config: WorldConfig) {
    this.config = config;
    this.width = config.width;
    this.height = config.height;
    this.rng = new SeededRNG(config.seed);
    this.initializeWorld();
  }

  private initializeWorld() {
    this.agents = [];
    this.resources = [];
    this.tickCount = 0;

    // Spawn Agents
    for (let i = 0; i < this.config.initialAgentCount; i++) {
      this.agents.push(this.createAgent(i.toString()));
    }

    // Spawn Resources
    for (let i = 0; i < this.config.initialResourceCount; i++) {
      this.spawnResource();
    }
  }

  private createAgent(idSuffix: string): AgentData {
    return {
      id: `agent-${idSuffix}-${this.rng.next().toFixed(4)}`,
      position: this.rng.point(this.width, this.height),
      velocity: { x: 0, y: 0 },
      energy: 100,
      maxEnergy: 100,
      state: AgentState.IDLE,
      target: null,
      score: 0,
      config: { ...this.config.agentConfig }, // Clone to allow individual drift later if needed
      memory: [],
      generation: 1,
    };
  }

  private spawnResource() {
    const typeRoll = this.rng.next();
    let type: Resource['type'] = 'FOOD';
    let color = '#4ade80'; // green
    let value = 20;

    if (typeRoll > 0.8) {
      type = 'DATA';
      color = '#38bdf8'; // blue
      value = 40;
    } else if (typeRoll > 0.95) {
      type = 'WATER';
      color = '#60a5fa';
      value = 30;
    }

    this.resources.push({
      id: `res-${this.tickCount}-${this.rng.next().toFixed(4)}`,
      position: this.rng.point(this.width, this.height),
      value,
      type,
      color,
    });
  }

  public update() {
    this.tickCount++;

    // 1. Update Agents
    this.agents.forEach(agent => {
      this.updateAgentDecision(agent);
      this.updateAgentPhysics(agent);
      this.updateAgentMetabolism(agent);
    });

    // 2. Remove dead agents
    this.agents = this.agents.filter(a => a.energy > 0);

    // 3. Replenish resources (slowly)
    if (this.tickCount % 20 === 0 && this.resources.length < this.config.initialResourceCount) {
      if (this.rng.next() > 0.3) {
        this.spawnResource();
      }
    }
  }

  private updateAgentDecision(agent: AgentData) {
    // Basic Goal Oriented Action Planning (Simplified)

    // Cost of Action: Thinking costs nothing, but moving is calculated in metabolism
    
    // Perception
    const visibleResources = this.resources.filter(r => this.distance(agent.position, r.position) < agent.config.visionRadius);
    const visibleAgents = this.agents.filter(a => a.id !== agent.id && this.distance(agent.position, a.position) < agent.config.visionRadius);

    // DECISION FUNCTION
    
    // Default: Idle/Wander
    let bestUtility = 0;
    let chosenState = AgentState.IDLE;
    let chosenTarget: Vec2 | null = null;

    // Option 1: Gather Resource
    // Utility = (ResourceValue * Greed) / Distance
    visibleResources.forEach(res => {
      const dist = Math.max(1, this.distance(agent.position, res.position));
      const utility = (res.value * agent.config.greed * 10) / dist;
      
      if (utility > bestUtility) {
        bestUtility = utility;
        chosenState = AgentState.GATHERING;
        chosenTarget = res.position;
      }
    });

    // Option 2: Social / Share (or Steal if aggressive)
    // If energy is high, maybe share? If energy low and aggressive, maybe steal?
    visibleAgents.forEach(other => {
      const dist = Math.max(1, this.distance(agent.position, other.position));
      
      // Aggression Logic: Steal energy if hungry and aggressive
      if (agent.config.aggressiveness > 0.5 && agent.energy < 50 && other.energy > 20) {
        const utility = (other.energy * agent.config.aggressiveness) / dist;
        if (utility > bestUtility) {
            bestUtility = utility;
            chosenState = AgentState.FLEEING; // Actually chasing, but we'll reuse states for simplicity or add ATTACKING
             // For this sim, let's map Aggression to "Chasing"
             chosenTarget = other.position;
        }
      }
    });

    // Option 3: Wander (exploration)
    // Base utility depends on energy. High energy = more exploring.
    const wanderUtility = (agent.energy / 100) * 0.5;
    if (wanderUtility > bestUtility && !agent.target) {
       // Pick random point nearby
       const angle = this.rng.next() * Math.PI * 2;
       const dist = this.rng.range(50, 100);
       chosenTarget = {
         x: Math.max(0, Math.min(this.width, agent.position.x + Math.cos(angle) * dist)),
         y: Math.max(0, Math.min(this.height, agent.position.y + Math.sin(angle) * dist))
       };
       chosenState = AgentState.MOVING;
    }

    // Apply Decision
    if (chosenState !== AgentState.IDLE) {
        agent.state = chosenState;
        if (chosenTarget) agent.target = chosenTarget;
    } else {
        // Fallback if nothing interesting
        agent.state = AgentState.IDLE;
    }
  }

  private updateAgentPhysics(agent: AgentData) {
    if (agent.state === AgentState.IDLE) return;

    if (agent.target) {
      const dx = agent.target.x - agent.position.x;
      const dy = agent.target.y - agent.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        // Arrived
        this.handleArrival(agent);
      } else {
        // Move
        const speed = agent.config.maxSpeed;
        agent.velocity = {
          x: (dx / dist) * speed,
          y: (dy / dist) * speed
        };
        
        agent.position.x += agent.velocity.x;
        agent.position.y += agent.velocity.y;
      }
    }
  }

  private handleArrival(agent: AgentData) {
      // Check if resource is there
      const resourceIndex = this.resources.findIndex(r => this.distance(r.position, agent.position) < 10);
      
      if (resourceIndex !== -1) {
          // Eat
          const resource = this.resources[resourceIndex];
          agent.energy = Math.min(agent.maxEnergy, agent.energy + resource.value);
          agent.score += 1;
          agent.memory.push({
              tick: this.tickCount,
              event: `Consumed ${resource.type}`,
              location: { ...resource.position },
              value: resource.value
          });
          // Remove resource
          this.resources.splice(resourceIndex, 1);
          agent.state = AgentState.IDLE;
          agent.target = null;
      } else {
          // Just reached a point (wandering)
          agent.state = AgentState.IDLE;
          agent.target = null;
      }
  }

  private updateAgentMetabolism(agent: AgentData) {
    // Base cost
    let cost = agent.config.metabolism;
    
    // Movement cost
    if (agent.state === AgentState.MOVING || agent.state === AgentState.GATHERING) {
        cost *= 1.5;
    }

    agent.energy -= cost;

    // Bounds check physics
    agent.position.x = Math.max(0, Math.min(this.width, agent.position.x));
    agent.position.y = Math.max(0, Math.min(this.height, agent.position.y));
  }

  private distance(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getStats() {
      return {
          tick: this.tickCount,
          agentCount: this.agents.length,
          avgEnergy: this.agents.length ? this.agents.reduce((acc, a) => acc + a.energy, 0) / this.agents.length : 0,
      };
  }
}
