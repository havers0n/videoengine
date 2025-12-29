import React, { useRef, useEffect } from 'react';
import { randomRange, distance, clamp, normalizeVector, Vector } from '../utils/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  history: Vector[];
  speedFactor: number;
}

interface Hotspot {
  x: number;
  y: number;
  radius: number;
  intensity: number; // 0 to 1
  baseColor: string;
  pulseTimer: number;
}

interface ScannerState {
  radius: number;
  active: boolean;
  speed: number;
}

const ScannerCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Simulation constants
  const TRAIL_LENGTH = 15;
  const PARTICLE_COUNT = 180;
  const MAX_VELOCITY = 2.5;
  const SCAN_SPEED = 2;
  
  // Refs to hold mutable state without triggering re-renders
  const particles = useRef<Particle[]>([]);
  const hotspots = useRef<Hotspot[]>([]);
  const scanner = useRef<ScannerState>({ radius: 0, active: true, speed: SCAN_SPEED });
  const dimensions = useRef({ width: 0, height: 0 });

  const initSystem = (width: number, height: number) => {
    particles.current = [];
    hotspots.current = [];
    
    // Create Hotspots (Risk Zones)
    const hotspotCount = 3;
    for (let i = 0; i < hotspotCount; i++) {
      hotspots.current.push({
        x: randomRange(width * 0.2, width * 0.8),
        y: randomRange(height * 0.2, height * 0.8),
        radius: randomRange(40, 80),
        intensity: 0.2,
        baseColor: i === 0 ? '#ff0055' : '#ff9900', // Red or Orange
        pulseTimer: 0,
      });
    }

    // Create Particles (Threads)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.current.push({
        x: randomRange(0, width),
        y: randomRange(0, height),
        vx: randomRange(-0.5, 0.5),
        vy: randomRange(-0.5, 0.5),
        history: [],
        speedFactor: randomRange(0.8, 1.2),
      });
    }
    
    dimensions.current = { width, height };
  };

  const updatePhysics = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. Update Scanner
    if (scanner.current.active) {
      scanner.current.radius += scanner.current.speed;
      const maxDim = Math.max(width, height);
      
      // Reset scanner when it goes off screen
      if (scanner.current.radius > maxDim * 0.8) {
        scanner.current.radius = 0;
      }
    }

    // 2. Update Hotspots & Check Scan Collision
    hotspots.current.forEach(spot => {
      // Pulse decay
      if (spot.intensity > 0.2) {
        spot.intensity *= 0.96; // Decay factor
      }
      
      // Scanner collision logic
      const distToCenter = distance(width / 2, height / 2, spot.x, spot.y);
      const distDiff = Math.abs(distToCenter - scanner.current.radius);
      
      // If scanner ring crosses the hotspot (approximate check)
      if (distDiff < 10 && spot.intensity < 0.8) {
        spot.intensity = 1.0; // Trigger pulse
      }
      
      // Oscillate radius slightly for "alive" feel
      spot.pulseTimer += 0.05;
    });

    // 3. Update Particles
    particles.current.forEach(p => {
      // Store history for trails
      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > TRAIL_LENGTH) {
        p.history.shift();
      }

      // Base movement
      p.x += p.vx;
      p.y += p.vy;

      // Field Force from Hotspots
      hotspots.current.forEach(spot => {
        const d = distance(p.x, p.y, spot.x, spot.y);
        const influenceRadius = spot.radius * 3;

        if (d < influenceRadius) {
          // Calculate vector from hotspot to particle
          const dx = p.x - spot.x;
          const dy = p.y - spot.y;
          const forceVector = normalizeVector({ x: dx, y: dy });
          
          // Force strength inversely proportional to distance (stronger when closer)
          // Modified by hotspot intensity (agitated hotspots push harder)
          const forceMagnitude = (1 - d / influenceRadius) * 0.15 * (1 + spot.intensity * 2);

          // Apply Force: Repel and Swirl
          // Repulsion
          p.vx += forceVector.x * forceMagnitude;
          p.vy += forceVector.y * forceMagnitude;
          
          // Swirl (tangent force)
          p.vx += -forceVector.y * forceMagnitude * 0.5;
          p.vy += forceVector.x * forceMagnitude * 0.5;
        }
      });

      // Velocity Clamp (Damping)
      const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (currentSpeed > MAX_VELOCITY) {
        p.vx = (p.vx / currentSpeed) * MAX_VELOCITY;
        p.vy = (p.vy / currentSpeed) * MAX_VELOCITY;
      }

      // Screen Wrapping
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear with slight opacity? No, explicit clear for crisp trails, we draw trails manually.
    ctx.clearRect(0, 0, width, height);

    // Global glow settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw Hotspots
    hotspots.current.forEach(spot => {
      const pulseSize = Math.sin(spot.pulseTimer) * 5;
      
      // Glow
      ctx.shadowBlur = 30 * spot.intensity;
      ctx.shadowColor = spot.baseColor;
      
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.radius + pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${spot.baseColor === '#ff0055' ? '255, 0, 85' : '255, 153, 0'}, ${0.1 + spot.intensity * 0.2})`;
      ctx.fill();
      
      // Core
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Label (Tech UI)
      if (spot.intensity > 0.4) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`RISK DETECTED ${(spot.intensity * 100).toFixed(0)}%`, spot.x + 10, spot.y - 10);
      }
    });

    // 2. Draw Scan Ring
    if (scanner.current.active) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.5 - (scanner.current.radius / Math.max(width, height)) * 0.5})`;
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, scanner.current.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Draw Particles (Threads)
    // Turn off heavy shadowBlur for particles to save performance, or keep it low
    ctx.shadowBlur = 0; 
    
    particles.current.forEach((p, i) => {
      if (p.history.length < 2) return;

      // Color based on velocity/agitation
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const normalizedSpeed = clamp(speed / MAX_VELOCITY, 0, 1);
      
      // Lerp color from Cyan (calm) to Magenta (fast/risk)
      // Simple approximation logic for speed
      const r = Math.floor(normalizedSpeed * 255);
      const g = Math.floor(255 - normalizedSpeed * 200);
      const b = 255;
      
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
      ctx.lineWidth = 1;

      // Draw the trail
      ctx.moveTo(p.history[0].x, p.history[0].y);
      for (let j = 1; j < p.history.length; j++) {
        ctx.lineTo(p.history[j].x, p.history[j].y);
      }
      ctx.stroke();
      
      // Draw head
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    });

    // 4. Tech UI Overlay (Canvas drawn)
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.font = '12px monospace';
    ctx.fillText(`THREADS: ${particles.current.length}`, 20, 30);
    ctx.fillText(`HOTSPOTS: ${hotspots.current.length}`, 20, 50);
    ctx.fillText(`SCAN_RADIUS: ${scanner.current.radius.toFixed(0)}`, 20, 70);
  };

  const renderLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions.current;
    
    updatePhysics(ctx, width, height);
    draw(ctx, width, height);

    requestRef.current = requestAnimationFrame(renderLoop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        // Re-init system if dimensions change significantly, 
        // or just update dimensions ref to prevent stretching
        if (Math.abs(canvas.width - dimensions.current.width) > 50) {
            initSystem(canvas.width, canvas.height);
        } else {
            dimensions.current = { width: canvas.width, height: canvas.height };
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    requestRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
    />
  );
};

export default ScannerCanvas;