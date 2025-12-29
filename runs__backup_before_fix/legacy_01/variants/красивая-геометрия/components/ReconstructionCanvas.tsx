import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Cube, Point3D } from '../types';
import { projectIso, easeOutCubic, easeInExpo, easeOutElastic, lerpColor, generateGridPositions } from '../utils/math';

interface Props {
  width: number;
  height: number;
  onPhaseChange: (phaseIndex: number) => void;
}

const CUBE_COUNT = 125; // 5x5x5
const GRID_SPACING = 2.5;
const LOOP_DURATION = 18000; // 18s

const COLOR_WHITE: [number, number, number] = [220, 220, 220];
const COLOR_RED: [number, number, number] = [239, 68, 68];   // Tailwind red-500
const COLOR_CYAN: [number, number, number] = [6, 182, 212];  // Tailwind cyan-500
const COLOR_GLOW: [number, number, number] = [255, 255, 255]; 

export const ReconstructionCanvas: React.FC<Props> = ({ width, height, onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize Cubes
  const cubes = useMemo(() => {
    const newCubes: Cube[] = [];
    const gridPositions = generateGridPositions(CUBE_COUNT, GRID_SPACING);
    
    for (let i = 0; i < CUBE_COUNT; i++) {
      // Random start pos (Dispersion)
      const radius = 30 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const startPos = {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi)
      };

      // Crash pos (Clustered in center but messy)
      const crashPos = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 5, // Flatter impact
        z: (Math.random() - 0.5) * 10
      };

      newCubes.push({
        id: i,
        startPos,
        crashPos,
        finalPos: gridPositions[i] || { x: 0, y: 0, z: 0 },
        currentPos: { ...startPos },
        currentSize: 1,
        color: 'rgb(255,255,255)',
        opacity: 1,
        speedOffset: Math.random(),
        rotationOffset: {
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI
        }
      });
    }
    return newCubes;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let startTime: number | null = null;
    let frameId: number;

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % LOOP_DURATION;
      const progress = elapsed / LOOP_DURATION; // 0 to 1
      
      // Determine Phase
      // 0-6s (0-0.33): Dispersion
      // 6-12s (0.33-0.66): Crash
      // 12-18s (0.66-1.0): Assembly
      
      let phaseIndex = 0;
      let localTime = 0; // 0 to 1 within phase
      let cameraRotation = elapsed * 0.0002; // Base rotation
      let shakeAmount = 0;

      if (elapsed < 6000) {
        phaseIndex = 0;
        localTime = elapsed / 6000;
        // Slow float
      } else if (elapsed < 12000) {
        phaseIndex = 1;
        localTime = (elapsed - 6000) / 6000;
        // Fast crash
        if (localTime > 0.8) {
           shakeAmount = (Math.random() - 0.5) * 10 * localTime; // Shake intensity ramps up
        }
      } else {
        phaseIndex = 2;
        localTime = (elapsed - 12000) / 6000;
        // Assembly spin
        cameraRotation += easeOutCubic(localTime) * Math.PI; // Fast spin into lock
      }
      
      onPhaseChange(phaseIndex);

      // Canvas Setup
      canvas.width = width;
      canvas.height = height;
      
      // Screen Shake application
      ctx.save();
      if (shakeAmount !== 0) {
        ctx.translate(shakeAmount, shakeAmount);
      }
      
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) / 25; // Zoom scale

      // Update and Project Cubes
      const drawList: { zIndex: number, draw: () => void }[] = [];

      cubes.forEach(cube => {
        let targetX = 0, targetY = 0, targetZ = 0;
        let r, g, b;
        
        // --- PHASE 1: DISPERSION ---
        if (phaseIndex === 0) {
           // Floating noise
           const floatSpeed = 0.002;
           const noiseX = Math.sin(elapsed * floatSpeed + cube.id) * 2;
           const noiseY = Math.cos(elapsed * floatSpeed + cube.id * 0.5) * 2;
           
           targetX = cube.startPos.x + noiseX;
           targetY = cube.startPos.y + noiseY;
           targetZ = cube.startPos.z;
           
           r = COLOR_WHITE[0]; g = COLOR_WHITE[1]; b = COLOR_WHITE[2];
        } 
        // --- PHASE 2: CRASH ---
        else if (phaseIndex === 1) {
          // Accelerate towards crash center
          const t = easeInExpo(localTime);
          targetX = cube.startPos.x + (cube.crashPos.x - cube.startPos.x) * t;
          targetY = cube.startPos.y + (cube.crashPos.y - cube.startPos.y) * t;
          targetZ = cube.startPos.z + (cube.crashPos.z - cube.startPos.z) * t;
          
          // Color transition White -> Red on impact (near end of phase)
          const colorT = Math.max(0, (localTime - 0.7) * 3.33); // Start changing at 0.7
          const color = lerpColor(COLOR_WHITE, COLOR_RED, Math.min(1, colorT));
          const rgb = color.match(/\d+/g)?.map(Number) || COLOR_RED;
          r = rgb[0]; g = rgb[1]; b = rgb[2];
        } 
        // --- PHASE 3: ASSEMBLY ---
        else {
           // Magnetic assembly
           const t = easeOutElastic(localTime);
           targetX = cube.crashPos.x + (cube.finalPos.x - cube.crashPos.x) * t;
           targetY = cube.crashPos.y + (cube.finalPos.y - cube.crashPos.y) * t;
           targetZ = cube.crashPos.z + (cube.finalPos.z - cube.crashPos.z) * t;

           // Color Red -> Cyan
           const color = lerpColor(COLOR_RED, COLOR_CYAN, Math.min(1, localTime * 2));
           
           // Final moment glow (white flash)
           if (localTime > 0.95) {
             const glowT = (localTime - 0.95) * 20;
             const finalColor = lerpColor([r,g,b] as any, COLOR_GLOW, glowT);
             // Final Logo formation: just flatten Z
             targetZ = targetZ * (1 - glowT); 
             // Align rotation to 0 at end
             cameraRotation = cameraRotation * (1-glowT); 
           } else {
             const rgb = color.match(/\d+/g)?.map(Number) || COLOR_CYAN;
             r = rgb[0]; g = rgb[1]; b = rgb[2];
           }
        }

        // Projection
        const projected = projectIso({ x: targetX, y: targetY, z: targetZ }, { x: centerX, y: centerY }, scale, cameraRotation);
        
        // Create draw command
        const size = scale * 0.9; // Base size of voxel
        
        drawList.push({
          zIndex: projected.depth,
          draw: () => {
             // Fake 3D Cube (3 Faces)
             // Top Face
             ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
             ctx.beginPath();
             ctx.moveTo(projected.x, projected.y - size);
             ctx.lineTo(projected.x + size * 0.866, projected.y - size * 0.5);
             ctx.lineTo(projected.x, projected.y);
             ctx.lineTo(projected.x - size * 0.866, projected.y - size * 0.5);
             ctx.closePath();
             ctx.fill();

             // Right Face (Darker)
             ctx.fillStyle = `rgb(${Math.floor(r*0.7)}, ${Math.floor(g*0.7)}, ${Math.floor(b*0.7)})`;
             ctx.beginPath();
             ctx.moveTo(projected.x, projected.y);
             ctx.lineTo(projected.x + size * 0.866, projected.y - size * 0.5);
             ctx.lineTo(projected.x + size * 0.866, projected.y + size * 0.5);
             ctx.lineTo(projected.x, projected.y + size);
             ctx.closePath();
             ctx.fill();

             // Left Face (Darkest)
             ctx.fillStyle = `rgb(${Math.floor(r*0.5)}, ${Math.floor(g*0.5)}, ${Math.floor(b*0.5)})`;
             ctx.beginPath();
             ctx.moveTo(projected.x, projected.y);
             ctx.lineTo(projected.x - size * 0.866, projected.y - size * 0.5);
             ctx.lineTo(projected.x - size * 0.866, projected.y + size * 0.5);
             ctx.lineTo(projected.x, projected.y + size);
             ctx.closePath();
             ctx.fill();
             
             // Optional: Glow in Phase 3
             if (phaseIndex === 2 && localTime > 0.5) {
               ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * localTime})`;
               ctx.lineWidth = 1;
               ctx.stroke();
             }
          }
        });
      });

      // Painter's Algorithm: Sort by depth (furthest first)
      drawList.sort((a, b) => a.zIndex - b.zIndex);
      
      // Execute draw commands
      drawList.forEach(item => item.draw());

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [width, height, cubes, onPhaseChange]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};
