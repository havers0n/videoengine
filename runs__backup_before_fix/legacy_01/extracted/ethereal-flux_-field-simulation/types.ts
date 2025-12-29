
export interface SimConfig {
  particleCount: number;
  noiseScale: number;
  noiseSpeed: number;
  particleSpeed: number;
  particleColor: string;
  fieldColor: string;
  trailAlpha: number;
  showField: boolean;
  fieldResolution: number;
  strokeWeight: number;
  hueRotate: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  prevX: number;
  prevY: number;
  hue: number;
}
