import React, { useRef, useEffect } from 'react';
import { CyclicAutomaton } from '../engine/CyclicAutomaton';

interface SimulationCanvasProps {
  engine: CyclicAutomaton;
  colors: string[];
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ engine, colors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Cache color strings to actual fill styles or integers for speed
    // For 100x100, string fillStyle is fine. For larger, we'd use ImageData.
    // Let's use ImageData for better performance on scaling.
    
    const width = engine.width;
    const height = engine.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Precompute RGB values from hex/string colors
    const colorMap = colors.map(c => {
      // Very basic hex parser, assuming format #RRGGBB
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      return { r, g, b };
    });

    let animationId: number;

    const render = () => {
      const grid = engine.getGrid();
      
      // Update ImageData
      for (let i = 0; i < grid.length; i++) {
        const state = grid[i];
        // Fallback to last color if state > colors.length (dynamic state growth)
        const col = colorMap[state % colorMap.length]; 
        
        const idx = i * 4;
        data[idx] = col.r;
        data[idx + 1] = col.g;
        data[idx + 2] = col.b;
        data[idx + 3] = 255; // Alpha
      }

      ctx.putImageData(imgData, 0, 0);
      
      // Scale up using CSS, but let's ensure the canvas resolution matches the engine
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [engine, colors]); // Re-bind if colors change heavily, though engine is mutable ref mostly

  return (
    <canvas 
      ref={canvasRef} 
      width={engine.width} 
      height={engine.height} 
      className="w-full h-full object-contain"
    />
  );
};

export default SimulationCanvas;
