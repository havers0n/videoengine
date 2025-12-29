export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Particle {
  id: number;
  // Current World Position
  x: number;
  y: number;
  z: number;
  // Target Position (for lerping)
  tx: number;
  ty: number;
  tz: number;
  // Visuals
  size: number;
  baseColor: string;
  // Phase 1: Random drift parameters
  driftOffset: Point3D;
  driftSpeed: number;
  driftPhase: number;
  // Phase 3: Grid Position
  gridPos: Point3D;
}

export enum AnimPhase {
  DISPERSION = 0, // 0s - 6s
  CRITICAL = 1,   // 6s - 12s
  ASSEMBLY = 2,   // 12s - 18s
  FINISHED = 3    // > 18s
}