import { Vector2, Particle, Hotspot, GridCell } from '../types';
import { SeededRNG } from './rng';
import { MAX_SPEED, FORCE_MAGNITUDE, DAMPING, COLOR_PALETTE, PARTICLE_COUNT, GRID_COLS, GRID_ROWS } from '../constants';

// ---- Vector Math Helpers ----
const add = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const mult = (v: Vector2, n: number): Vector2 => ({ x: v.x * n, y: v.y * n });
const sub = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x - v2.x, y: v1.y - v2.y });
const mag = (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y);
const normalize = (v: Vector2): Vector2 => {
  const m = mag(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
};
const limit = (v: Vector2, max: number): Vector2 => {
  const m = mag(v);
  if (m > max) {
    return mult(normalize(v), max);
  }
  return v;
};

// ---- Initialization ----

export const initParticles = (rng: SeededRNG, width: number, height: number): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pos = { x: rng.range(0, width), y: rng.range(0, height) };
    particles.push({
      pos: { ...pos },
      prevPos: { ...pos },
      vel: { x: rng.range(-1, 1), y: rng.range(-1, 1) },
      color: rng.pick(COLOR_PALETTE),
      size: rng.range(1, 2.5),
      life: rng.next(),
    });
  }
  return particles;
};

export const initHotspots = (rng: SeededRNG, width: number, height: number): Hotspot[] => {
  // Deterministic placement relative to screen size
  return [
    {
      pos: { x: width * 0.3, y: height * 0.4 },
      strength: 25,
      radius: Math.min(width, height) * 0.25,
      type: 'swirl',
    },
    {
      pos: { x: width * 0.7, y: height * 0.6 },
      strength: -20, // Repel/Anti-swirl
      radius: Math.min(width, height) * 0.3,
      type: 'swirl',
    },
    {
      pos: { x: width * 0.5, y: height * 0.5 },
      strength: 5,
      radius: Math.min(width, height) * 0.4,
      type: 'attract',
    }
  ];
};

// ---- Field Calculation ----

// Deterministic noise function based on Sine/Cosine for perfect looping
// t is 0.0 to 1.0 (normalized loop time)
const getNoiseAngle = (x: number, y: number, t: number, width: number, height: number): number => {
  // Normalized coordinates
  const nx = x / width;
  const ny = y / height;
  
  // Loop angle
  const loopAngle = t * Math.PI * 2;
  const loopX = Math.cos(loopAngle);
  const loopY = Math.sin(loopAngle);

  // Base flow
  const n1 = Math.sin(nx * 3 + loopX) * Math.cos(ny * 3 + loopY);
  const n2 = Math.sin(nx * 6 - loopY) * Math.cos(ny * 6 + loopX);
  
  // Map -1..1 to 0..PI*2
  return (n1 + n2) * Math.PI;
};

export const calculateGrid = (
  width: number, 
  height: number, 
  t: number, 
  hotspots: Hotspot[]
): GridCell[][] => {
  const grid: GridCell[][] = [];
  const cellW = width / GRID_COLS;
  const cellH = height / GRID_ROWS;

  for (let col = 0; col < GRID_COLS; col++) {
    const column: GridCell[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const centerX = col * cellW + cellW / 2;
      const centerY = row * cellH + cellH / 2;

      // Base noise field
      let angle = getNoiseAngle(centerX, centerY, t, width, height);
      let vector = { x: Math.cos(angle), y: Math.sin(angle) };

      // Apply Hotspots
      hotspots.forEach(spot => {
        const dVec = sub(spot.pos, { x: centerX, y: centerY });
        const dist = mag(dVec);
        
        if (dist < spot.radius) {
          const factor = (1 - dist / spot.radius); // 0 to 1 strength
          let forceVec = { x: 0, y: 0 };

          if (spot.type === 'attract') {
            forceVec = normalize(dVec);
          } else if (spot.type === 'repel') {
             forceVec = mult(normalize(dVec), -1);
          } else if (spot.type === 'swirl') {
             // Perpendicular vector
             forceVec = { x: -dVec.y, y: dVec.x };
             forceVec = normalize(forceVec);
          }
          
          // Blend field with hotspot
          const blend = factor * 0.8;
          vector = add(mult(vector, 1 - blend), mult(forceVec, blend));
        }
      });

      vector = normalize(vector);
      column.push({ angle: Math.atan2(vector.y, vector.x), vector });
    }
    grid.push(column);
  }
  return grid;
};

// ---- Update Logic ----

export const updateParticle = (
  p: Particle, 
  grid: GridCell[][], 
  width: number, 
  height: number
): void => {
  // Save previous position for line drawing
  p.prevPos.x = p.pos.x;
  p.prevPos.y = p.pos.y;

  // Sample grid
  const cellW = width / GRID_COLS;
  const cellH = height / GRID_ROWS;
  
  let col = Math.floor(p.pos.x / cellW);
  let row = Math.floor(p.pos.y / cellH);

  // Clamp indices
  col = Math.max(0, Math.min(GRID_COLS - 1, col));
  row = Math.max(0, Math.min(GRID_ROWS - 1, row));

  const force = grid[col][row].vector;

  // Apply forces
  const acc = mult(force, FORCE_MAGNITUDE);
  p.vel = add(p.vel, acc);
  p.vel = limit(p.vel, MAX_SPEED);
  p.vel = mult(p.vel, DAMPING); // Friction

  // Move
  p.pos = add(p.pos, p.vel);

  // Wrap around edges
  let wrapped = false;
  if (p.pos.x < 0) { p.pos.x = width; p.prevPos.x = width; wrapped = true; }
  if (p.pos.x > width) { p.pos.x = 0; p.prevPos.x = 0; wrapped = true; }
  if (p.pos.y < 0) { p.pos.y = height; p.prevPos.y = height; wrapped = true; }
  if (p.pos.y > height) { p.pos.y = 0; p.prevPos.y = 0; wrapped = true; }

  // Avoid drawing a line across the screen on wrap
  if (wrapped) {
    p.prevPos = { ...p.pos };
  }
};
