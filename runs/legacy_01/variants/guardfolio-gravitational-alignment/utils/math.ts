export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export const clamp = (val: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, val));
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const smoothStep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
};

// Generate points on a sphere using Fibonacci spiral for even distribution
export const getFibonacciSpherePoint = (i: number, n: number, radius: number) => {
  const phi = Math.acos(1 - 2 * (i + 0.5) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;

  const x = Math.cos(theta) * Math.sin(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(phi);

  return { x: x * radius, y: y * radius, z: z * radius };
};

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const lerpColor = (c1: RGB, c2: RGB, t: number): RGB => {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
};

export const colorToString = (c: RGB, alpha: number = 1) => {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;
};