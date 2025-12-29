export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const degreesToRadians = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Vector interface for physics calculations
export interface Vector {
  x: number;
  y: number;
}

export const normalizeVector = (v: Vector): Vector => {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};