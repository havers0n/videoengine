import { Point3D } from '../types';

// Simple easing functions
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInExpo = (x: number): number => x === 0 ? 0 : Math.pow(2, 10 * x - 10);
export const easeOutElastic = (x: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
};
export const easeInOutQuad = (x: number): number => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

// Isometric projection helper
export const projectIso = (point: Point3D, center: { x: number, y: number }, scale: number, rotationY: number): { x: number, y: number, depth: number } => {
  // Rotate around Y axis first
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  
  const rx = point.x * cos - point.z * sin;
  const rz = point.x * sin + point.z * cos;
  const ry = point.y;

  // Isometric projection
  // x_screen = (rx - rz) * cos(30)
  // y_screen = ry + (rx + rz) * sin(30)
  // 30 degrees is approx 0.523599 radians
  
  const isoX = (rx - rz) * 0.866; // cos(30)
  const isoY = ry + (rx + rz) * 0.5; // sin(30)

  return {
    x: center.x + isoX * scale,
    y: center.y + isoY * scale,
    depth: rz + rx // depth for sorting
  };
};

// Color interpolation
export const lerpColor = (c1: [number, number, number], c2: [number, number, number], t: number): string => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

// 3D Grid generator
export const generateGridPositions = (count: number, spacing: number): Point3D[] => {
  const positions: Point3D[] = [];
  const side = Math.ceil(Math.pow(count, 1/3));
  const offset = (side * spacing) / 2 - (spacing / 2);

  for (let x = 0; x < side; x++) {
    for (let y = 0; y < side; y++) {
      for (let z = 0; z < side; z++) {
        if (positions.length < count) {
          positions.push({
            x: x * spacing - offset,
            y: y * spacing - offset,
            z: z * spacing - offset
          });
        }
      }
    }
  }
  return positions;
};
