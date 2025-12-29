export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Particle {
  id: number;
  // Current Position
  x: number;
  y: number;
  z: number;
  // Target Position
  tx: number;
  ty: number;
  tz: number;
  // Velocity (for floating noise)
  vx: number;
  vy: number;
  vz: number;
  // Visuals
  size: number;
  baseColor: string; // Hex
}

export enum AnimationPhase {
  DISPERSION = 'DISPERSION',
  CRASH = 'CRASH',
  ASSEMBLY = 'ASSEMBLY',
}