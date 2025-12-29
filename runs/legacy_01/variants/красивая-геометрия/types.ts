export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Cube {
  id: number;
  // Positions for different states
  startPos: Point3D;
  crashPos: Point3D;
  finalPos: Point3D;
  
  // Current dynamic state
  currentPos: Point3D;
  currentSize: number;
  
  // Visuals
  color: string;
  opacity: number;
  
  // Animation offsets
  speedOffset: number;
  rotationOffset: Point3D;
}

export enum AnimationPhase {
  DISPERSION = 'DISPERSION',
  CRASH = 'CRASH',
  ASSEMBLY = 'ASSEMBLY',
  COMPLETE = 'COMPLETE'
}

export interface PhaseConfig {
  label: string;
  subLabel: string;
  startTime: number;
  duration: number;
}