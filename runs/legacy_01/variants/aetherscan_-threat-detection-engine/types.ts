export interface Vector2 {
  x: number;
  y: number;
}

export interface NodeEntity {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  riskLevel: number; // 0.0 to 1.0
  active: boolean; // Is currently scanned/highlighted
  scanIntensity: number; // Decay factor for visual highlight
  radius: number;
  connections: string[]; // IDs of connected nodes
}

export interface ScanWave {
  id: string;
  origin: Vector2;
  currentRadius: number;
  maxRadius: number;
  speed: number;
  strength: number; // Opacity/Intensity
  type: 'radar' | 'pulse' | 'alert';
}

export interface Particle {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
}

export interface EngineConfig {
  nodeCount: number;
  connectionThreshold: number;
  scanSpeed: number;
  riskThreshold: number;
}