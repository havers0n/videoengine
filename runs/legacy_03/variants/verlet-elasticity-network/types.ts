export interface Vector2 {
  x: number;
  y: number;
}

export interface Node {
  id: number;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
  mass: number;
}

export interface Edge {
  p1: number; // Index of Node 1
  p2: number; // Index of Node 2
  length: number; // Resting length
  tension: number; // Current visual tension (0 to 1+)
}

export interface Anchor {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  strength: number;
}

export interface Hotspot {
  x: number;
  y: number;
  radius: number;
  force: number;
  frequency: number;
  phaseOffset: number;
}

export interface SimState {
  nodes: Node[];
  edges: Edge[];
  anchors: Anchor[];
  hotspots: Hotspot[];
  time: number;
  width: number;
  height: number;
}