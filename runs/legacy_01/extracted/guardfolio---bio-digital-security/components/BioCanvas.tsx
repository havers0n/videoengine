import React, { useRef, useEffect, useState } from 'react';
import { NodeEntity, NodeState, ANIMATION_DURATION, PHASE_1_DURATION, PHASE_2_DURATION } from '../types';

// Colors
const COLOR_HEALTHY = { r: 0, g: 255, b: 200 }; // Teal/Green
const COLOR_INFECTED = { r: 255, g: 20, b: 60 }; // Bright Red
const COLOR_SECURED = { r: 60, g: 140, b: 255 }; // Royal Blue

// Utility for interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const BioCanvas: React.FC<{ onPhaseChange: (p: 1 | 2 | 3) => void }> = ({ onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NodeEntity[]>([]);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  // Initialize Nodes
  const initNodes = (width: number, height: number) => {
    const nodes: NodeEntity[] = [];
    const count = window.innerWidth < 768 ? 50 : 100;
    
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 2,
        state: NodeState.HEALTHY,
        infectionTime: 0,
        baseColor: `rgba(${COLOR_HEALTHY.r}, ${COLOR_HEALTHY.g}, ${COLOR_HEALTHY.b}, 0.7)`
      });
    }
    nodesRef.current = nodes;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      initNodes(window.innerWidth, window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = elapsed % ANIMATION_DURATION; // Loop it or stop? Requirement says continuous 18s. Let's loop.

      // Determine Phase
      let currentPhase: 1 | 2 | 3 = 1;
      if (progress > PHASE_2_DURATION) currentPhase = 3;
      else if (progress > PHASE_1_DURATION) currentPhase = 2;
      
      onPhaseChange(currentPhase);

      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear Canvas with a slight fade for trail effect if desired, but clean clear is better for this style
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Phase-Specific Logic Triggers
      const nodes = nodesRef.current;
      
      // -- PHASE 2 START: INFECTION --
      if (progress >= PHASE_1_DURATION && progress < PHASE_1_DURATION + 100) {
        // Trigger patient zero if not already valid
        const patientZero = nodes.reduce((prev, curr) => {
            const dPrev = Math.hypot(prev.x - centerX, prev.y - centerY);
            const dCurr = Math.hypot(curr.x - centerX, curr.y - centerY);
            return dPrev < dCurr ? prev : curr;
        }); // Find closest to center
        
        if (patientZero.state === NodeState.HEALTHY) {
           patientZero.state = NodeState.INFECTED;
           patientZero.infectionTime = progress;
        }
      }

      // -- PHASE 3 START: QUARANTINE -- 
      if (progress >= PHASE_2_DURATION && progress < PHASE_2_DURATION + 100) {
        // Assign roles: Center ones become secure, outer ones become isolated
        nodes.forEach(node => {
           const distFromCenter = Math.hypot(node.x - centerX, node.y - centerY);
           if (distFromCenter < Math.min(width, height) * 0.25) {
             node.state = NodeState.SECURED;
           } else {
             node.state = NodeState.ISOLATED;
           }
        });
      }

      // -- RESET LOGIC (Loop) --
      if (progress < 100) {
        nodes.forEach(n => {
           n.state = NodeState.HEALTHY;
           n.infectionTime = 0;
           n.targetPos = undefined;
        });
      }


      // --- UPDATE & DRAW LOOP ---

      // 1. Draw Scanner Ring (Phase 3 Transition)
      if (currentPhase === 3) {
        const scanTime = progress - PHASE_2_DURATION;
        const maxRadius = Math.max(width, height) * 0.6;
        const radius = Math.min(maxRadius, (scanTime / 1000) * maxRadius);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${1 - radius/maxRadius})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // 2. Physics & State Updates
      nodes.forEach(node => {
        
        // MOVEMENT
        if (currentPhase === 3) {
          // Force fields
          if (node.state === NodeState.SECURED) {
             // Move towards shield formation (circle)
             const angle = (node.id / nodes.length) * Math.PI * 2 * 3; // scatter nicely
             const targetR = 150;
             const tx = centerX + Math.cos(angle) * targetR;
             const ty = centerY + Math.sin(angle) * targetR;
             node.x += (tx - node.x) * 0.05;
             node.y += (ty - node.y) * 0.05;
          } else if (node.state === NodeState.ISOLATED) {
             // Push away
             const dx = node.x - centerX;
             const dy = node.y - centerY;
             const dist = Math.hypot(dx, dy);
             const angle = Math.atan2(dy, dx);
             const targetR = Math.max(width, height) * 0.45;
             if (dist < targetR) {
                node.x += Math.cos(angle) * 5;
                node.y += Math.sin(angle) * 5;
             }
             // Jitter
             node.x += (Math.random() - 0.5) * 2;
             node.y += (Math.random() - 0.5) * 2;
          }
        } else {
          // Brownian motion
          node.x += node.vx;
          node.y += node.vy;

          // Wall bounce
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          // Spasm if infected
          if (node.state === NodeState.INFECTED) {
            node.x += (Math.random() - 0.5) * 3;
            node.y += (Math.random() - 0.5) * 3;
          }
        }

        // INFECTION SPREAD (Phase 2)
        if (currentPhase === 2 && node.state === NodeState.INFECTED) {
           nodes.forEach(neighbor => {
              if (neighbor.state === NodeState.HEALTHY) {
                 const dx = node.x - neighbor.x;
                 const dy = node.y - neighbor.y;
                 const dist = Math.hypot(dx, dy);
                 if (dist < 100) {
                    // Transmission probability increases with proximity
                    if (Math.random() < 0.05) {
                       neighbor.state = NodeState.INFECTED;
                       neighbor.infectionTime = progress;
                    }
                 }
              }
           });
        }
      });

      // 3. Draw Connections
      ctx.lineWidth = 1;
      // Optimize: Only check nearby nodes or limit loops. For < 100 nodes, N^2 is fine (~10k ops).
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
           const a = nodes[i];
           const b = nodes[j];
           const dx = a.x - b.x;
           const dy = a.y - b.y;
           const dist = Math.hypot(dx, dy);
           const threshold = 120;

           if (dist < threshold) {
              const alpha = 1 - (dist / threshold);
              
              // Color logic for lines
              if (currentPhase === 3) {
                 // Clean lines in center, no lines to outside?
                 if (a.state === NodeState.SECURED && b.state === NodeState.SECURED) {
                    ctx.strokeStyle = `rgba(${COLOR_SECURED.r}, ${COLOR_SECURED.g}, ${COLOR_SECURED.b}, ${alpha * 0.8})`;
                 } else if (a.state === NodeState.ISOLATED && b.state === NodeState.ISOLATED) {
                    ctx.strokeStyle = `rgba(${COLOR_INFECTED.r}, ${COLOR_INFECTED.g}, ${COLOR_INFECTED.b}, ${alpha * 0.2})`;
                 } else {
                    continue; // Break connection between shield and virus
                 }
              } else {
                 // Gradient based on states
                 if (a.state === NodeState.INFECTED && b.state === NodeState.INFECTED) {
                    ctx.strokeStyle = `rgba(${COLOR_INFECTED.r}, ${COLOR_INFECTED.g}, ${COLOR_INFECTED.b}, ${alpha})`;
                 } else if (a.state === NodeState.HEALTHY && b.state === NodeState.HEALTHY) {
                    ctx.strokeStyle = `rgba(${COLOR_HEALTHY.r}, ${COLOR_HEALTHY.g}, ${COLOR_HEALTHY.b}, ${alpha * 0.3})`;
                 } else {
                    // Mixed
                    ctx.strokeStyle = `rgba(150, 150, 150, ${alpha * 0.2})`;
                 }
              }
              
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
           }
        }
      }

      // 4. Draw Nodes
      nodes.forEach(node => {
         // Determine Color
         let r, g, b;
         if (node.state === NodeState.HEALTHY) { r=COLOR_HEALTHY.r; g=COLOR_HEALTHY.g; b=COLOR_HEALTHY.b; }
         else if (node.state === NodeState.INFECTED || node.state === NodeState.ISOLATED) { r=COLOR_INFECTED.r; g=COLOR_INFECTED.g; b=COLOR_INFECTED.b; }
         else { r=COLOR_SECURED.r; g=COLOR_SECURED.g; b=COLOR_SECURED.b; } // SECURED

         // Pulse Size
         const pulse = Math.sin(progress * 0.005 + node.id) * 1 + 1; // 0 to 2
         const currentRadius = node.radius + pulse;

         // GLOW SETTINGS
         ctx.shadowBlur = 15;
         ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
         
         // Infected Bloom Intensity
         if (currentPhase === 2 && node.state === NodeState.INFECTED) {
            ctx.shadowBlur = 30;
         }

         ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
         ctx.beginPath();
         ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
         ctx.fill();
         
         // Core highlight
         ctx.fillStyle = 'rgba(255,255,255,0.8)';
         ctx.beginPath();
         ctx.arc(node.x, node.y, currentRadius * 0.3, 0, Math.PI * 2);
         ctx.fill();
      });
      
      // Reset Shadow for next frame performance
      ctx.shadowBlur = 0;

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [onPhaseChange]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-black">
      <canvas ref={canvasRef} className="block" />
      {/* Vignette Overlay for atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
    </div>
  );
};
