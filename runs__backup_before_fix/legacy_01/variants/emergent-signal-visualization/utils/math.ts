// Simple Pseudo-Random Noise Generation
// Using a permutation table for a basic Perlin-like gradient noise
// to avoid heavy external dependencies for this specific visualization.

const PERM = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  PERM[i] = i;
}
// Shuffle
for (let i = 0; i < 256; i++) {
  const j = Math.floor(Math.random() * 256);
  const temp = PERM[i];
  PERM[i] = PERM[j];
  PERM[j] = temp;
}

const P = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
  P[i] = PERM[i & 255];
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number) {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function noise3D(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = P[X] + Y;
  const AA = P[A] + Z;
  const AB = P[A + 1] + Z;
  const B = P[X + 1] + Y;
  const BA = P[B] + Z;
  const BB = P[B + 1] + Z;

  return lerp(w,
    lerp(v,
      lerp(u, grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z)),
      lerp(u, grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z))
    ),
    lerp(v,
      lerp(u, grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1))
    )
  );
}

export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
