/**
 * Types for 3D and 2D coordinates
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Particle extends Point3D {
  id: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number; // For pulsing effects
}

/**
 * Constants for Isometric Projection
 * Isometric angle approx 30 degrees (PI / 6)
 */
const ANGLE = Math.PI / 6;
const COS_A = Math.cos(ANGLE);
const SIN_A = Math.sin(ANGLE);

/**
 * Projects a 3D point to 2D isometric space.
 * @param p The 3D point (x, y, z)
 * @param originX The screen center X
 * @param originY The screen center Y
 * @param scale Global scale multiplier
 */
export const projectIso = (
  p: Point3D, 
  originX: number, 
  originY: number, 
  scale: number
): Point2D => {
  // Isometric Formula:
  // x_screen = (x - z) * cos(30)
  // y_screen = y + (x + z) * sin(30)
  
  // Note: We flip Y in 3D space usually because screen Y is down, 
  // but let's assume world Y is Up, so we subtract world Y.
  
  const x2 = (p.x - p.z) * COS_A * scale;
  const y2 = (p.y + (p.x + p.z) * SIN_A) * scale; // Tilted plane
  
  // Adjust logic: Standard Iso usually has Y as up/down vertical.
  // Let's stick to standard 2.5D projection:
  // X axis goes down-right, Z axis goes down-left, Y axis goes Up.
  
  const isoX = (p.x - p.z) * Math.cos(0.523599); // ~30 deg
  const isoY = p.y + (p.x + p.z) * Math.sin(0.523599); 

  return {
    x: originX + isoX * scale,
    y: originY + isoY * scale, // Inverted Y for screen coords handled in logic
  };
};

/**
 * Calculates a sorting value for Painter's Algorithm.
 * In isometric view, objects with higher X, Y, and Z draw closer to the bottom/front.
 * However, since Y is vertical height here, higher Y means 'higher up'.
 * 
 * Depth Metric: (x + z) usually defines the distance from the back corner.
 */
export const getDepth = (p: Point3D): number => {
  return p.x + p.z - p.y; // Simple depth heuristic for this specific isometric angle
};

/**
 * Linear Interpolation
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Generates the path strings for a cube's 3 visible faces based on a center point.
 */
export const getCubeFaces = (cx: number, cy: number, size: number) => {
  const h = size * 0.5; // Half width look
  const v = size * 0.25; // Vertical squat for perspective
  
  // Top Face (Rhombus)
  const top = [
    { x: cx, y: cy - size },           // Top
    { x: cx + size, y: cy - size/2 },  // Right
    { x: cx, y: cy },                  // Bottom
    { x: cx - size, y: cy - size/2 }   // Left
  ];

  // Right Face
  const right = [
    { x: cx, y: cy },
    { x: cx + size, y: cy - size/2 },
    { x: cx + size, y: cy + size/2 },
    { x: cx, y: cy + size }
  ];

  // Left Face
  const left = [
    { x: cx, y: cy },
    { x: cx, y: cy + size },
    { x: cx - size, y: cy + size/2 },
    { x: cx - size, y: cy - size/2 }
  ];

  return { top, right, left };
};