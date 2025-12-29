export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  pos: Vector2;
  vel: Vector2;
  prevPos: Vector2;
  color: string;
  size: number;
  life: number; // 0 to 1 for alpha variation
}

export interface Hotspot {
  pos: Vector2;
  strength: number;
  radius: number;
  type: 'attract' | 'repel' | 'swirl';
}

export interface GridCell {
  angle: number;
  vector: Vector2;
}

export interface SimulationState {
  particles: Particle[];
  grid: GridCell[][];
  hotspots: Hotspot[];
}
