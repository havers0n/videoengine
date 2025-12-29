
export interface Vector2 {
  x: number;
  y: number;
}

export interface Sector {
  id: number;
  name: string;
  center: Vector2;
  mass: number;
  color: string;
}

export interface Node {
  id: number;
  sectorId: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  mass: number;
}

export interface Thread {
  sourceId: number;
  targetId: number;
  length: number;
  strength: number;
  isInterSector: boolean;
}

export interface SimulationState {
  progress: number;
  isPaused: boolean;
  nodes: Node[];
  sectors: Sector[];
  threads: Thread[];
}
