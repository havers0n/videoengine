// Linear Congruential Generator for seeded random numbers
export class SeededRNG {
  private m = 0x80000000;
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: number) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextInt(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }

  nextFloat(): number {
    // Returns range [0, 1]
    return this.nextInt() / (this.m - 1);
  }

  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  cluster: number;
  color: string;
  // Trail history (circular buffer or simple array)
  history: { x: number; y: number }[];
}

export interface SimulationConfig {
  particleCount: number;
  clusterCount: number;
  connectionDistance: number;
  mouseRepelRadius: number;
  mouseRepelForce: number;
  friction: number;
  speed: number;
}

export const HSLToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const GRID_CELL_SIZE = 80;
