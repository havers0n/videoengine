export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const clamp = (val: number, min: number, max: number): number => {
  return Math.min(Math.max(val, min), max);
};

export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

export const distSq = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
};

// Cosine interpolation for smoother pulses
export const cosineInterp = (t: number): number => {
  return (1 - Math.cos(t * Math.PI)) / 2;
};

// RGB array to string
export const rgbToRgbaString = (rgb: number[], alpha: number): string => {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};
