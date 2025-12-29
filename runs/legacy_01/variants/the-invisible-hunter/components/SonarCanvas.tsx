import React, { useRef, useEffect, useState } from 'react';
import { Phase, Node, Dimensions } from '../types';
import { COLORS, NODE_COUNT, CONNECTION_DISTANCE } from '../constants';

interface SonarCanvasProps {
  phase: Phase;
  elapsedTime: number;
  isPlaying: boolean;
}

const SonarCanvas: React.FC<SonarCanvasProps> = ({ phase, elapsedTime, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  
  // Mutable state for animation performance
  const nodesRef = useRef<Node[]>([]);
  const frameRef = useRef<number>(0);

  // Initialize Nodes
  const initNodes = (width: number, height: number) => {
    const nodes: Node[] = [];
    const cols = Math.ceil(Math.sqrt(NODE_COUNT));
    const rows = cols;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let i = 0; i < NODE_COUNT; i++) {
      // Random position for Chaos
      const x = Math.random() * width;
      const y = Math.random() * height;
      
      // Target position for Grid (Phase 3)
      const col = i % cols;
      const row = Math.floor(i / cols);
      const gridX = col * cellW + cellW / 2;
      const gridY = row * cellH + cellH / 2;

      nodes.push({
        id: i,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        gridX,
        gridY,
        connections: []
      });
    }

    // Pre-calculate random connections for the "Trap" phase
    nodes.forEach(node => {
        nodes.forEach(target => {
            if (node.id !== target.id) {
                const dx = node.x - target.x;
                const dy = node.y - target.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                // Randomly connect nearby nodes to create a messy web
                if (dist < CONNECTION_DISTANCE && Math.random() > 0.6) {
                    node.connections.push(target.id);
                }
            }
        });
    });

    nodesRef.current = nodes;
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        if (nodesRef.current.length === 0) {
            initNodes(clientWidth, clientHeight);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fix DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const maxRadius = Math.max(dimensions.width, dimensions.height) * 0.8;

    const render = () => {
      // Clear Screen
      ctx.fillStyle = COLORS.BG;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const nodes = nodesRef.current;
      const time = performance.now();

      // --- SHARED UTILS ---
      const sonarSpeed = 0.4;
      // Pulse loop every 2 seconds
      const sonarLoop = (elapsedTime % 2000); 
      const sonarRadius = sonarLoop * sonarSpeed;
      
      // --- PHASE SPECIFIC LOGIC ---

      // Phase 3 Scanner position calculation
      // Scanner moves from left to right over 2 seconds (approx) at start of Phase 3
      const scannerProgress = phase === Phase.THE_MAP 
        ? Math.min((elapsedTime - 12000) / 2000, 1) 
        : 0;
      const scannerX = scannerProgress * dimensions.width;

      // Draw Grid Background for Phase 3 (only left of scanner)
      if (phase === Phase.THE_MAP) {
         ctx.save();
         ctx.beginPath();
         ctx.rect(0, 0, scannerX, dimensions.height);
         ctx.clip();
         
         ctx.strokeStyle = 'rgba(0, 50, 80, 0.3)';
         ctx.lineWidth = 1;
         const gridSize = 50;
         for (let x = 0; x < dimensions.width; x += gridSize) {
             ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dimensions.height); ctx.stroke();
         }
         for (let y = 0; y < dimensions.height; y += gridSize) {
             ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dimensions.width, y); ctx.stroke();
         }
         ctx.restore();
      }

      // Draw Sonar Rings (Phase 1 & 2 only)
      if (phase !== Phase.THE_MAP) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, sonarRadius, 0, Math.PI * 2);
          ctx.strokeStyle = phase === Phase.THE_TRAP ? COLORS.PHASE_2_SONAR : COLORS.PHASE_1_SONAR;
          ctx.lineWidth = phase === Phase.THE_TRAP ? 3 : 2;
          ctx.stroke();

          // Second echo ring
          if (sonarLoop > 500) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, Math.max(0, sonarRadius - 200), 0, Math.PI * 2);
            ctx.strokeStyle = phase === Phase.THE_TRAP ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
      }

      // Draw Nodes & Connections
      nodes.forEach(node => {
        // Movement Logic
        if (phase !== Phase.THE_MAP) {
            node.x += node.vx;
            node.y += node.vy;
            // Bounce
            if (node.x < 0 || node.x > dimensions.width) node.vx *= -1;
            if (node.y < 0 || node.y > dimensions.height) node.vy *= -1;
        } else {
            // Lerp to grid position if behind scanner
            if (node.x < scannerX) {
                node.x += (node.gridX - node.x) * 0.1;
                node.y += (node.gridY - node.y) * 0.1;
            }
        }

        // Distance from center (for sonar)
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const distFromCenter = Math.sqrt(dx*dx + dy*dy);
        
        // Determine Visibility based on Sonar
        // In Phase 3, everything left of scanner is visible
        let alpha = 0.1;
        let isLit = false;

        if (phase === Phase.THE_MAP) {
            if (node.x < scannerX) {
                alpha = 1;
                isLit = true;
            } else {
                alpha = 0.1; // Dark ahead of scanner
            }
        } else {
            // Sonar Logic: beam width approx 50px
            const distDiff = Math.abs(distFromCenter - sonarRadius);
            if (distDiff < 80) {
                alpha = 1 - (distDiff / 80); // Fade out at edges of beam
                isLit = true;
            } else {
                 // Trail effect logic could go here, but simple decay is cleaner
                 alpha = 0.1;
            }
        }

        // Override Alpha for Phase 2 "Trap" intensity
        if (phase === Phase.THE_TRAP && isLit) {
            alpha = 1.0;
        }

        // --- DRAW CONNECTIONS ---
        // Phase 2: Red Web
        if (phase === Phase.THE_TRAP && isLit) {
            ctx.strokeStyle = COLORS.PHASE_2_LINE;
            const jitter = (Math.random() - 0.5) * 3; // Nervous vibration
            ctx.lineWidth = 1 + Math.sin(time / 50); // Heartbeat pulse
            
            node.connections.forEach(targetId => {
                const target = nodes[targetId];
                // Only draw if target is roughly lit or close enough to be "caught" in the web
                // Simplify: Just draw if we are lit
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                // Jagged line
                const mx = (node.x + target.x) / 2 + jitter;
                const my = (node.y + target.y) / 2 + jitter;
                ctx.lineTo(mx, my);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            });
        }
        
        // Phase 3: Blue Grid Connections
        if (phase === Phase.THE_MAP && isLit) {
             ctx.strokeStyle = COLORS.PHASE_3_LINE;
             ctx.lineWidth = 1;
             
             // Draw clean lines to nearest neighbors (simulated grid connections)
             // Since we lerped to gridX/gridY, we can just check proximity
             nodes.forEach(target => {
                 if (node.id !== target.id && target.x < scannerX) {
                     const d = Math.sqrt(Math.pow(node.x - target.x, 2) + Math.pow(node.y - target.y, 2));
                     if (d < 100) { // Clean short connections
                         ctx.beginPath();
                         ctx.moveTo(node.x, node.y);
                         ctx.lineTo(target.x, target.y);
                         ctx.stroke();
                     }
                 }
             });
        }


        // --- DRAW NODE DOT ---
        ctx.beginPath();
        // Dynamic color
        if (phase === Phase.THE_MAP && isLit) ctx.fillStyle = COLORS.PHASE_3_DOT;
        else if (phase === Phase.THE_TRAP && isLit) ctx.fillStyle = COLORS.PHASE_2_DOT;
        else ctx.fillStyle = isLit ? '#ffffff' : COLORS.PHASE_1_DOT;

        const radius = isLit ? 3 : 2;
        ctx.globalAlpha = alpha;
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // Reset
      });

      // --- DRAW SCANNER LINE (Phase 3) ---
      if (phase === Phase.THE_MAP) {
          if (scannerX < dimensions.width) {
              ctx.beginPath();
              ctx.moveTo(scannerX, 0);
              ctx.lineTo(scannerX, dimensions.height);
              ctx.strokeStyle = COLORS.PHASE_3_SCANNER;
              ctx.lineWidth = 4;
              ctx.shadowColor = COLORS.PHASE_3_SCANNER;
              ctx.shadowBlur = 20;
              ctx.stroke();
              ctx.shadowBlur = 0; // Reset
          }
      }

      // Vignette
      const gradient = ctx.createRadialGradient(centerX, centerY, maxRadius * 0.6, centerX, centerY, maxRadius);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      if (isPlaying) {
        frameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [dimensions, phase, elapsedTime, isPlaying]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SonarCanvas;
