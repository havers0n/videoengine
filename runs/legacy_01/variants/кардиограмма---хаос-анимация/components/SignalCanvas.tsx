import React, { useRef, useEffect, useState } from 'react';
import { SignalPhase } from '../types';

interface SignalCanvasProps {
  onPhaseChange: (phase: SignalPhase, progress: number) => void;
}

const SignalCanvas: React.FC<SignalCanvasProps> = ({ onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = Date.now();
    const totalDuration = 18000; // 18s loop

    // Resize handler
    const resize = () => {
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // Helper: Draw Grid
    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      ctx.strokeStyle = 'rgba(0, 50, 20, 0.15)';
      ctx.lineWidth = 1;
      
      const gridSize = 40;
      const offset = (time * 0.02) % gridSize;

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines (moving)
      for (let y = -gridSize + offset; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    // Phase 1: Flatline (Smooth Sine)
    const drawFlatline = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      const centerY = height / 2;
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';

      for (let x = 0; x < width; x++) {
        const freq = 0.005;
        const amp = 80;
        const speed = 0.003;
        const y = centerY + Math.sin(x * freq + time * speed) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Phase 2: Interference (Noise with Chromatic Aberration)
    const drawInterference = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      const centerY = height / 2;
      
      // We draw 3 lines with offsets for RGB split effect
      const offsets = [
        { color: 'rgba(255, 0, 0, 0.9)', xOff: -4, yOff: 0 },
        { color: 'rgba(0, 255, 0, 0.7)', xOff: 0, yOff: 0 },
        { color: 'rgba(0, 0, 255, 0.9)', xOff: 4, yOff: 0 }
      ];

      offsets.forEach(({ color, xOff, yOff }) => {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = 'screen'; // Additive blending for light feel
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Use a seeded random feel based on x + time to make it jittery but coherent frame-to-frame
        // Actually, for static noise, true random per frame is too fast. 
        // We need "scrolling" noise or Perlin-ish noise. 
        // Simple hack: combine multiple high freq sines + random spikes.

        for (let x = 0; x < width; x += 3) { // Step 3 for jaggedness
            // Create a noisy signal
            const t = time * 0.01;
            const noise = Math.sin(x * 0.1 + t) * Math.cos(x * 0.5 - t * 2) * Math.sin(x * 0.02);
            
            // Occasional large spikes
            const spike = Math.random() > 0.95 ? (Math.random() - 0.5) * 300 : 0;
            
            const amp = 150;
            let y = centerY + (noise * amp) + spike + yOff;

            // Clamp
            y = Math.max(0, Math.min(height, y));

            if (x === 0) ctx.moveTo(x + xOff, y);
            else ctx.lineTo(x + xOff, y);
        }
        ctx.stroke();
      });

      ctx.globalCompositeOperation = 'source-over'; // Reset
      ctx.shadowBlur = 0;
    };

    // Phase 3: Harmony (Organized Streams)
    const drawHarmony = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      const centerY = height / 2;
      const streamCount = 5;
      const baseColor = { r: 0, g: 255, b: 255 }; // Cyan
      
      // Calculate merge progress (last 2 seconds of 18s loop?)
      // Actually, just keep them parallel and clean.
      
      for (let i = 0; i < streamCount; i++) {
        ctx.beginPath();
        // Calculate offset from center
        const spacing = 40;
        const totalHeight = (streamCount - 1) * spacing;
        const startY = centerY - totalHeight / 2;
        const currentBaseY = startY + i * spacing;

        // Fade in color based on index
        const alpha = 0.6 + (i / streamCount) * 0.4;
        ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';

        for (let x = 0; x < width; x++) {
          // Clean, perfect digital waves
          // Different frequencies for each line but harmonically related
          const freq = 0.01 + (i * 0.002);
          const speed = 0.005;
          const amp = 15 * (Math.sin(time * 0.001) + 2); // Breathing amplitude

          // Introduce a "data packet" look - occasional squared off sections? 
          // Keep it sine for "Harmony" as requested ("parallel, organized data streams")
          // Let's add a second sine wave modulation to make it look like FM synthesis
          const mod = Math.sin(x * 0.05 + time * 0.01) * 5;

          const y = currentBaseY + Math.sin(x * freq - time * speed) * amp + mod;
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    // Main Loop
    const render = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const cycleTime = elapsed % totalDuration;
      
      // Clear
      ctx.fillStyle = '#050505'; // Deep black/grey
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, canvas.width, canvas.height, now);

      let currentPhase = SignalPhase.FLATLINE;

      if (cycleTime < 6000) {
        currentPhase = SignalPhase.FLATLINE;
        drawFlatline(ctx, canvas.width, canvas.height, now);
      } else if (cycleTime < 12000) {
        currentPhase = SignalPhase.INTERFERENCE;
        drawInterference(ctx, canvas.width, canvas.height, now);
      } else {
        currentPhase = SignalPhase.HARMONY;
        drawHarmony(ctx, canvas.width, canvas.height, now);
      }

      // Determine progress within phase (0 to 1)
      const phaseProgress = (cycleTime % 6000) / 6000;
      onPhaseChange(currentPhase, phaseProgress);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onPhaseChange]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SignalCanvas;