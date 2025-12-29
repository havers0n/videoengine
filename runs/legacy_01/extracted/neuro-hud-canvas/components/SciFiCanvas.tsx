import React, { useRef, useEffect } from 'react';
import { SeededRNG, getOscillator, dist, clamp } from '../utils/math';
import { Particle, Hotspot, Vector2 } from '../types';

const TRAIL_LENGTH = 10;
const PARTICLE_COUNT = 60;
const CONNECTION_DIST = 120;
const MOUSE_INFLUENCE_RAD = 200;

export const SciFiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const stateRef = useRef<{
    particles: Particle[];
    hotspots: Hotspot[];
    startTime: number;
    mouse: Vector2;
  }>({
    particles: [],
    hotspots: [],
    startTime: performance.now(),
    mouse: { x: -1000, y: -1000 },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const rng = new SeededRNG(42);

    // Initialize state
    const init = () => {
      const w = canvas.width;
      const h = canvas.height;

      stateRef.current.particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        id: i,
        pos: { x: rng.nextRange(0, w), y: rng.nextRange(0, h) },
        vel: { x: rng.nextRange(-1, 1), y: rng.nextRange(-1, 1) },
        radius: rng.nextRange(1.5, 3),
        hue: rng.nextRange(160, 220), // Cyan/Blue range
        life: rng.nextFloat(),
        history: [],
      }));

      stateRef.current.hotspots = [
        { id: 1, pos: { x: w * 0.2, y: h * 0.3 }, label: 'SEC_NODE_A', active: true, scanProgress: 0 },
        { id: 2, pos: { x: w * 0.8, y: h * 0.7 }, label: 'SEC_NODE_B', active: false, scanProgress: 0 },
        { id: 3, pos: { x: w * 0.5, y: h * 0.5 }, label: 'MAIN_CORE', active: true, scanProgress: 0 },
      ];
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouse = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- RENDER LOOP ---
    const update = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const dt = 1; // Simplified delta for smooth visual flow independent of frame skips
      const tSeconds = (time - stateRef.current.startTime) / 1000;

      // Update Particles
      stateRef.current.particles.forEach((p) => {
        // Move
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;

        // Mouse avoidance/attraction
        const dMouse = dist(p.pos.x, p.pos.y, stateRef.current.mouse.x, stateRef.current.mouse.y);
        if (dMouse < MOUSE_INFLUENCE_RAD) {
          const angle = Math.atan2(p.pos.y - stateRef.current.mouse.y, p.pos.x - stateRef.current.mouse.x);
          const force = (MOUSE_INFLUENCE_RAD - dMouse) * 0.005;
          p.vel.x += Math.cos(angle) * force;
          p.vel.y += Math.sin(angle) * force;
        }

        // Damping and Bounds
        p.vel.x *= 0.99;
        p.vel.y *= 0.99;
        
        // Add minimal noise to keep them moving
        p.vel.x += getOscillator(time * 0.001 + p.id, 1) * 0.02;
        p.vel.y += getOscillator(time * 0.001 + p.id + 100, 1) * 0.02;

        if (p.pos.x < 0) { p.pos.x = w; p.history = []; }
        if (p.pos.x > w) { p.pos.x = 0; p.history = []; }
        if (p.pos.y < 0) { p.pos.y = h; p.history = []; }
        if (p.pos.y > h) { p.pos.y = 0; p.history = []; }

        // History for trails
        p.history.push({ x: p.pos.x, y: p.pos.y });
        if (p.history.length > TRAIL_LENGTH) p.history.shift();
      });

      // Update Hotspots
      stateRef.current.hotspots.forEach((hs, idx) => {
        // Hotspots slowly orbit their origin
        const orbitSpeed = 0.5;
        const offsetX = Math.sin(tSeconds * orbitSpeed + idx) * 30;
        const offsetY = Math.cos(tSeconds * orbitSpeed + idx) * 30;
        // Apply purely visual offset during draw, keep logical pos stable or update it:
        // Let's update logical for this demo
        // Re-centering logic would be needed for true orbit, simplifying to noise
        hs.scanProgress = (Math.sin(tSeconds * 2 + idx) + 1) / 2; // 0 to 1
      });
    };

    const draw = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const tSeconds = (time - stateRef.current.startTime) / 1000;

      // 1. Clear with Trail effect
      ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw Grid (Background)
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const gridOffset = (time * 0.02) % gridSize;
      
      ctx.beginPath();
      for (let x = -gridOffset; x < w; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = -gridOffset; y < h; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      // 3. Draw Connections (Threads)
      ctx.lineWidth = 1;
      const particles = stateRef.current.particles;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const d = dist(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
          if (d < CONNECTION_DIST) {
            const opacity = 1 - d / CONNECTION_DIST;
            ctx.strokeStyle = `rgba(0, 255, 200, ${opacity * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(p1.pos.x, p1.pos.y);
            ctx.lineTo(p2.pos.x, p2.pos.y);
            ctx.stroke();
          }
        }
      }

      // 4. Draw Particles & Trails
      ctx.globalCompositeOperation = 'lighter';
      particles.forEach(p => {
        // Trail
        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${p.hue}, 80%, 50%, 0.5)`;
          ctx.lineWidth = 2;
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (const point of p.history) ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }

        // Core
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, 1)`;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow halo
        const pulse = 1 + Math.sin(time * 0.01 + p.id) * 0.3;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, 0.1)`;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius * 4 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      // 5. Draw Hotspots
      stateRef.current.hotspots.forEach(hs => {
        const { x, y } = hs.pos;
        const scan = hs.scanProgress;
        
        // Target bracket
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        const size = 20;
        const gap = 5;
        
        ctx.beginPath();
        // Top Left
        ctx.moveTo(x - size, y - size + 10); ctx.lineTo(x - size, y - size); ctx.lineTo(x - size + 10, y - size);
        // Top Right
        ctx.moveTo(x + size - 10, y - size); ctx.lineTo(x + size, y - size); ctx.lineTo(x + size, y - size + 10);
        // Bottom Right
        ctx.moveTo(x + size, y + size - 10); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size - 10, y + size);
        // Bottom Left
        ctx.moveTo(x - size + 10, y + size); ctx.lineTo(x - size, y + size); ctx.lineTo(x - size, y + size - 10);
        ctx.stroke();

        // Rotating circle
        ctx.strokeStyle = `rgba(255, 0, 85, 0.5)`;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.5, tSeconds, tSeconds + Math.PI * 1.5);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ff0055';
        ctx.font = '10px "Courier New", monospace';
        ctx.fillText(`${hs.label} [${(scan * 100).toFixed(0)}%]`, x + size + 5, y - size);
      });

      // 6. Draw HUD (Deterministic Metrics)
      drawHUD(ctx, w, h, tSeconds);
    };

    const drawHUD = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const fontSize = 14;
      ctx.font = `${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#0ff';
      
      const pad = 30;
      const lineHeight = 20;

      // --- Top Left: System Stats ---
      let y = pad;
      const fps = (1000 / (performance.now() - (requestRef.current || 0) + 16)).toFixed(1); // Rough estimate
      
      const metrics = [
        `SYS_TIME : ${t.toFixed(2)}`,
        `LATENCY  : ${(20 + Math.sin(t) * 5).toFixed(1)}ms`,
        `MEM_USAGE: ${(40 + Math.cos(t * 0.5) * 10).toFixed(1)}%`,
        `THREAT_LV: ${(Math.abs(Math.sin(t * 0.2)) * 5).toFixed(0)}`,
        `NET_IO   : ↓${(Math.random() * 50 + 200).toFixed(0)} Mb/s`, // Pure noise for net
      ];

      metrics.forEach((text, i) => {
        // Blinking cursor effect for last line
        const cursor = (i === metrics.length - 1 && Math.floor(t * 2) % 2 === 0) ? '_' : '';
        // Random glitch character
        const glitch = Math.random() > 0.98 ? String.fromCharCode(33 + Math.floor(Math.random() * 90)) : text.charAt(text.length - 1);
        const finalText = Math.random() > 0.98 ? text.slice(0, -1) + glitch : text;
        
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.fillText(finalText + cursor, pad, y);
        y += lineHeight;
      });

      // --- Bottom Left: Scrolling Log ---
      // Deterministic log generation based on time buckets
      const logBucket = Math.floor(t);
      y = h - pad;
      for (let i = 0; i < 5; i++) {
        const logId = logBucket - i;
        if (logId < 0) break;
        // Pseudo-hash generation
        const hash = ((logId * 9301 + 49297) % 233280).toString(16).toUpperCase();
        const msg = `PROCESS_${hash.substring(0,4)} OK`;
        const alpha = 1 - (i / 5);
        ctx.fillStyle = `rgba(0, 255, 100, ${alpha})`;
        ctx.fillText(`[${(t - i * 0.5).toFixed(2)}] ${msg}`, pad, y);
        y -= lineHeight;
      }

      // --- Top Right: Radar / Graph ---
      const graphW = 150;
      const graphH = 60;
      const gx = w - pad - graphW;
      const gy = pad;
      
      // Box
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.strokeRect(gx, gy, graphW, graphH);
      
      // Waveform
      ctx.beginPath();
      ctx.strokeStyle = '#0f0';
      for (let i = 0; i < graphW; i++) {
        const val = Math.sin(i * 0.1 + t * 5) * Math.cos(i * 0.05 - t) * (graphH / 2 - 5);
        if (i === 0) ctx.moveTo(gx + i, gy + graphH / 2 + val);
        else ctx.lineTo(gx + i, gy + graphH / 2 + val);
      }
      ctx.stroke();
      ctx.fillText("WAVE_ANALYSIS", gx, gy - 5);

      // --- Bottom Right: Bars ---
      const barW = 200;
      const barH = 10;
      const bx = w - pad - barW;
      let by = h - pad - 60;
      
      ['CPU_0', 'CPU_1', 'GPU_0'].forEach((label, i) => {
        const fill = (Math.sin(t * (1 + i * 0.5)) + 1) / 2; // 0..1
        
        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(label, bx, by - 5);
        
        // Bar Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(bx, by, barW, barH);
        
        // Bar Fill
        const gradient = ctx.createLinearGradient(bx, by, bx + barW, by);
        gradient.addColorStop(0, '#0ff');
        gradient.addColorStop(1, '#f0f');
        ctx.fillStyle = gradient;
        ctx.fillRect(bx, by, barW * fill, barH);
        
        by += 30;
      });

      // --- Center: Crosshair ---
      // Only draw if tracking
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(w/2 - 20, h/2); ctx.lineTo(w/2 + 20, h/2);
      ctx.moveTo(w/2, h/2 - 20); ctx.lineTo(w/2, h/2 + 20);
      ctx.stroke();
      
      // Rotating ring around center
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(w/2, h/2, 100, t * 0.5, t * 0.5 + Math.PI);
      ctx.stroke();
    };

    // Animation Loop
    const loop = (time: number) => {
      update(time);
      draw(time);
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
    />
  );
};
