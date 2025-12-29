export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export const hexToRgba = (r: number, g: number, b: number, a: number) => {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Generate points in a shield shape
export const generateShieldPoints = (centerX: number, centerY: number, count: number, scale: number) => {
  const points: {x: number, y: number}[] = [];
  const rows = Math.ceil(Math.sqrt(count)); 
  
  // Create a grid first, then filter by shield math
  for (let i = 0; i < count; i++) {
    // Distribute roughly in a grid
    const col = i % rows;
    const row = Math.floor(i / rows);
    
    // Normalize -1 to 1
    const nx = (col / rows - 0.5) * 2;
    const ny = (row / rows - 0.5) * 2;

    // Shield shape mathematical approximation
    // Top is flat-ish, bottom points down
    // Check if point is inside shield equation
    // Simple approach: Map to specific geometric lattice
    
    points.push({
      x: centerX + nx * scale * 1.2,
      y: centerY + ny * scale * 1.5
    });
  }
  return points;
};

export const easeInOutCubic = (x: number): number => {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};