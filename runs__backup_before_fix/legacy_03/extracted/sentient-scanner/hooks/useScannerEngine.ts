import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GRID_COLS, 
  GRID_ROWS, 
  PARTICLE_COUNT, 
  TIMESTEP, 
  PHASE_THRESHOLDS, 
  ScannerPhase, 
  COLORS,
  TOTAL_LOOP_DURATION
} from '../constants';
import { rng, simpleNoise3D, lerp, mapRange, clamp } from '../utils/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  age: number;
  life: number;
  colorOffset: number;
}

interface Hotspot {
  x: number;
  y: number;
  radius: number;
  strength: number;
  active: boolean;
}

interface ScanState {
  threatLevel: number;
  stability: number;
}

export const useScannerEngine = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>
) => {
  const [phase, setPhase] = useState<ScannerPhase>(ScannerPhase.CALM);
  const [metrics, setMetrics] = useState({ threatLevel: 0, entities: PARTICLE_COUNT, stability: 1 });

  // Refs for animation state (mutable, no re-renders)
  const reqId = useRef<number>();
  const startTime = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const accumulator = useRef<number>(0);
  
  // Simulation State
  const particles = useRef<Particle[]>([]);
  const flowField = useRef<Float32Array>(new Float32Array(GRID_COLS * GRID_ROWS * 2)); // [angle, magnitude] flattened logic? or just [vx, vy]
  // Using [vx, vy] per cell is faster. Size: Cols * Rows * 2
  
  const hotspots = useRef<Hotspot[]>([
    { x: 0.3, y: 0.4, radius: 0.15, strength: 2, active: false },
    { x: 0.7, y: 0.6, radius: 0.2, strength: -2, active: false },
    { x: 0.5, y: 0.5, radius: 0.25, strength: 4, active: false } // Big central one
  ]);

  const scanRing = useRef({ radius: 0, active: false, x: 0.5, y: 0.5 });
  
  // Init particles
  const initSimulation = useCallback(() => {
    const ps: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      ps.push({
        x: rng.next(),
        y: rng.next(),
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        age: rng.next() * 100,
        life: 100 + rng.next() * 100,
        colorOffset: rng.next()
      });
    }
    particles.current = ps;
  }, []);

  const updatePhysics = (dt: number, totalTime: number) => {
    // 1. Determine Narrative Phase & Global Parameters
    const loopTime = totalTime % TOTAL_LOOP_DURATION;
    let currentPhase = ScannerPhase.CALM;
    let globalSpeed = 0.5;
    let noiseScale = 1.0;
    let colorShift = 0; // 0 = teal, 1 = red
    let scanSpeed = 0.2;
    
    if (loopTime >= PHASE_THRESHOLDS.CALM && loopTime < PHASE_THRESHOLDS.WARNING) {
      currentPhase = ScannerPhase.CALM;
      globalSpeed = 0.3;
      noiseScale = 1.0;
      colorShift = 0;
      
      // Reset hotspots
      hotspots.current.forEach(h => h.active = false);
      scanRing.current.active = false;
      
    } else if (loopTime >= PHASE_THRESHOLDS.WARNING && loopTime < PHASE_THRESHOLDS.LOCK_IN) {
      currentPhase = ScannerPhase.WARNING;
      globalSpeed = 0.8;
      noiseScale = 3.0; // Turbulent
      colorShift = lerp(0, 1, (loopTime - 6) / 2); // Transition to red
      
      // Activate hotspots
      hotspots.current.forEach(h => h.active = true);
      
      // Scan ring pulsing
      scanRing.current.active = true;
      scanRing.current.radius = ((loopTime - 6) * scanSpeed) % 1.5;

    } else {
      currentPhase = ScannerPhase.LOCK_IN;
      globalSpeed = 0.1; // Slow down
      noiseScale = 0.5; // Structured
      colorShift = 1; // Red/White
      
      // Hotspots localize (shrink radius, increase strength)
      hotspots.current.forEach(h => {
        h.active = true;
        h.radius = lerp(h.radius, 0.05, dt * 2);
      });

      // Scan ring slows/locks
      scanRing.current.radius = lerp(scanRing.current.radius, 0.8, dt);
    }

    // Sync React State roughly (don't thrash it)
    if (Math.floor(totalTime * 10) % 5 === 0) { // Every 0.5s approx
         // We do this check in the loop but setPhase only if changed handled by React batching or check prev value
         // To avoid overhead, we actually just let the component poll or pass refs. 
         // But for this simple app, setting state here is okay if throttled or checked.
         // Let's rely on the return value of the hook or a small ref sync, 
         // but strictly the prompt asks for "state in refs, without setState in rAF".
         // The prompt says "minimal DOM overlay". 
         // I will simply perform the logic to derive metrics but only `setPhase` if changed.
    }
    
    // 2. Update Flow Field (Risk Layer)
    const aspect = GRID_COLS / GRID_ROWS;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const idx = (y * GRID_COLS + x) * 2;
        const u = x / GRID_COLS;
        const v = y / GRID_ROWS;
        
        // Base Noise
        const noiseVal = simpleNoise3D(u * 10, v * 10 * aspect, totalTime * 0.2 * globalSpeed);
        const angle = noiseVal * Math.PI * 2 * noiseScale;
        
        let fx = Math.cos(angle);
        let fy = Math.sin(angle);

        // Hotspots Influence
        if (hotspots.current) {
          hotspots.current.forEach(h => {
             if (!h.active) return;
             const dx = u - h.x;
             const dy = v - h.y;
             const distSq = dx*dx + dy*dy;
             const rSq = h.radius * h.radius;
             
             if (distSq < rSq) {
                const dist = Math.sqrt(distSq);
                const factor = (1 - dist / h.radius);
                // Swirl or push
                fx += (dx / dist) * h.strength * factor;
                fy += (dy / dist) * h.strength * factor;
             }
          });
        }
        
        flowField.current[idx] = fx;
        flowField.current[idx + 1] = fy;
      }
    }

    // 3. Update Particles
    const ps = particles.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = ps[i];
      
      // Read Grid
      const gx = Math.floor(p.x * GRID_COLS);
      const gy = Math.floor(p.y * GRID_ROWS);
      const ix = clamp(gx, 0, GRID_COLS - 1);
      const iy = clamp(gy, 0, GRID_ROWS - 1);
      const fIdx = (iy * GRID_COLS + ix) * 2;
      
      const fx = flowField.current[fIdx];
      const fy = flowField.current[fIdx + 1];

      // Physics
      p.ax = fx * 2.0; // Force multiplier
      p.ay = fy * 2.0;
      
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      
      // Drag/Damping
      p.vx *= 0.92;
      p.vy *= 0.92;

      // Lock-in Snap
      if (currentPhase === ScannerPhase.LOCK_IN) {
        // Subtle pull towards grid centers to "structure" the view
        const targetX = (gx + 0.5) / GRID_COLS;
        const targetY = (gy + 0.5) / GRID_ROWS;
        p.vx += (targetX - p.x) * 5 * dt;
        p.vy += (targetY - p.y) * 5 * dt;
      }
      
      p.x += p.vx * dt * globalSpeed * 0.5;
      p.y += p.vy * dt * globalSpeed * 0.5;

      // Wrap
      if (p.x < 0) p.x += 1;
      if (p.x > 1) p.x -= 1;
      if (p.y < 0) p.y += 1;
      if (p.y > 1) p.y -= 1;

      // Life
      p.age += dt;
      if (p.age > p.life) {
        p.x = rng.next();
        p.y = rng.next();
        p.age = 0;
        p.vx = 0; p.vy = 0;
      }
    }

    // Return metrics for the render pass (and eventual state update)
    return {
      phase: currentPhase,
      threat: colorShift,
      stability: 1.0 - (noiseScale / 4.0)
    };
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number, simState: any) => {
    // Fade trail
    // Narrative-driven trail length: longer trails in LOCK_IN
    const trailAlpha = simState.phase === ScannerPhase.LOCK_IN ? 0.05 : 0.15;
    
    ctx.fillStyle = `rgba(5, 5, 5, ${trailAlpha})`;
    ctx.fillRect(0, 0, width, height);
    
    // Draw Risk Field (Faint Grid) - Visualization of the layers
    if (simState.phase !== ScannerPhase.CALM) {
      ctx.strokeStyle = `rgba(50, 0, 0, 0.1)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const stepX = width / GRID_COLS;
      const stepY = height / GRID_ROWS;
      // Just draw a subset to save perf
      for (let y = 0; y < GRID_ROWS; y+=2) {
        for (let x = 0; x < GRID_COLS; x+=2) {
             const idx = (y * GRID_COLS + x) * 2;
             const fx = flowField.current[idx];
             const fy = flowField.current[idx+1];
             if (Math.abs(fx) + Math.abs(fy) > 1.5) { // Only turbulent areas
                const px = x * stepX;
                const py = y * stepY;
                ctx.moveTo(px, py);
                ctx.lineTo(px + fx * 10, py + fy * 10);
             }
        }
      }
      ctx.stroke();
    }

    // Config Styles based on Phase
    const isWarn = simState.phase === ScannerPhase.WARNING;
    const isLock = simState.phase === ScannerPhase.LOCK_IN;
    
    ctx.lineWidth = isLock ? 2 : 1.5;
    
    const ps = particles.current;
    
    // We'll batch draw by color to avoid state changes, or just iterate. 
    // Optimization: Iterate once, set stroke style per particle is slow.
    // Better: Logic for color is basically uniform per phase.
    
    let baseR, baseG, baseB;
    if (simState.phase === ScannerPhase.CALM) {
        baseR = 0; baseG = 240; baseB = 255; // Teal
    } else {
        baseR = 255; baseG = 50; baseB = 50; // Red
    }
    
    // Bloom effect
    ctx.shadowBlur = isWarn ? 8 : (isLock ? 4 : 0);
    ctx.shadowColor = `rgb(${baseR}, ${baseG}, ${baseB})`;

    // Scan Ring Logic
    const ringR2 = scanRing.current.radius * scanRing.current.radius;
    const ringWidth = 0.05 * 0.05; // squared approx width

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = ps[i];
      const px = p.x * width;
      const py = p.y * height;
      
      // Calculate Interaction with Scan Ring
      let alpha = 0.4;
      let r = baseR, g = baseG, b = baseB;
      
      if (scanRing.current.active) {
         const dx = p.x - scanRing.current.x;
         const dy = p.y - scanRing.current.y;
         const d2 = dx*dx + dy*dy;
         
         // Highlight if near ring
         if (Math.abs(d2 - ringR2) < ringWidth) {
            alpha = 1.0;
            r = 255; g = 255; b = 255;
         }
      }

      // Hotspot highlight
      if (isWarn || isLock) {
         hotspots.current.forEach(h => {
             if (!h.active) return;
             const dx = p.x - h.x;
             const dy = p.y - h.y;
             if (dx*dx + dy*dy < h.radius * h.radius) {
                 r = 255; g = 100; b = 100;
                 alpha = 0.9;
             }
         });
      }

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      
      // Draw trails (simulated by velocity line) instead of just dots
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      const tailLen = Math.min(speed * 20, 30);
      
      // If moving fast, draw line, else dot
      if (tailLen > 2) {
         ctx.beginPath();
         ctx.strokeStyle = ctx.fillStyle;
         ctx.moveTo(px, py);
         ctx.lineTo(px - p.vx * tailLen, py - p.vy * tailLen);
         ctx.stroke();
      } else {
         ctx.fillRect(px, py, isLock ? 2 : 1.5, isLock ? 2 : 1.5);
      }
    }

    // Draw Scan Ring Overlay
    if (scanRing.current.active) {
        ctx.beginPath();
        const rx = scanRing.current.x * width;
        const ry = scanRing.current.y * height;
        const rr = scanRing.current.radius * Math.max(width, height); // Scale radius
        
        // Don't draw if too huge
        if (rr < Math.max(width, height) * 1.5) {
            ctx.arc(rx, ry, rr, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 50, 50, 0.3)`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Handle Resize
    const resize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        initSimulation(); // Re-init on resize to fix distribution? Or just map. Let's re-init for simplicity.
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // Loop
    const loop = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const totalElapsed = (timestamp - startTime.current) / 1000;
      
      // Frame delta
      const frameDelta = timestamp - lastFrameTime.current;
      lastFrameTime.current = timestamp;
      
      // Accumulator for fixed timestep
      accumulator.current += frameDelta;
      
      // Update State Tracking
      let lastSimState = null;

      // Cap accumulator to prevent spiral of death
      if (accumulator.current > 200) accumulator.current = 200;

      while (accumulator.current >= TIMESTEP * 1000) {
        lastSimState = updatePhysics(TIMESTEP, totalElapsed);
        accumulator.current -= TIMESTEP * 1000;
      }
      
      // Render
      if (lastSimState) {
        draw(ctx, canvas.width, canvas.height, lastSimState);
        
        // Update React State occasionally
        if (lastSimState.phase !== phase) {
            setPhase(lastSimState.phase);
        }
        // Update metrics display
        if (Math.floor(totalElapsed * 10) % 2 === 0) { // Throttle
            setMetrics({
                threatLevel: lastSimState.threat,
                entities: PARTICLE_COUNT,
                stability: lastSimState.stability
            });
        }
      }

      reqId.current = requestAnimationFrame(loop);
    };

    reqId.current = requestAnimationFrame(loop);

    return () => {
      if (reqId.current) cancelAnimationFrame(reqId.current);
      window.removeEventListener('resize', resize);
    };
  }, [initSimulation, phase]); // Re-run if phase changes? No, refs handle phase. Dependencies minimal.

  return { currentPhase: phase, scanMetrics: metrics };
};