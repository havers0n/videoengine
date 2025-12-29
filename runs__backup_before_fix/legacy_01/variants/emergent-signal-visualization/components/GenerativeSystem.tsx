import React, { useRef, useEffect, useCallback } from 'react';
import { PARTICLE_COUNT, DURATION_MS, COLORS, TEXT_MESSAGES, FADE_OUT_DURATION } from '../constants';
import { Particle, SystemState } from '../types';
import { noise3D, mapRange, clamp } from '../utils/math';

const GenerativeSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  
  // Initialize Particles
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        id: i,
        pos: { x: Math.random() * width, y: Math.random() * height },
        vel: { x: 0, y: 0 },
        acc: { x: 0, y: 0 },
        baseSpeed: 0.5 + Math.random() * 1.5,
        size: Math.random() < 0.9 ? 1 + Math.random() * 2 : 3 + Math.random() * 2,
        color: Math.random() > 0.9 ? COLORS.PARTICLE_C : (Math.random() > 0.5 ? COLORS.PARTICLE_A : COLORS.PARTICLE_B),
        alpha: 0.1 + Math.random() * 0.5,
        life: Math.random(),
      });
    }
    particlesRef.current = particles;
  }, []);

  // Compute System State based on time
  const getSystemState = (elapsed: number): SystemState => {
    // Normalize time 0 -> 1 over 18s
    const t = clamp(elapsed / DURATION_MS, 0, 1);
    
    // Easing functions for parameters
    const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const smoothStep = (x: number) => x * x * (3 - 2 * x);

    // Evolution Logic
    // 1. Energy: Starts low, peaks in middle (chaos), stabilizes at end
    // 2. Noise: Starts high (random), drops off
    // 3. Structure: Starts 0, ramps up
    // 4. Clarity: Fades in
    // 5. Confidence: Low damping -> High damping (stabilization)

    let energy = 0.3;
    let noise = 1.0;
    let structure = 0.0;
    let clarity = 0.0;
    let confidence = 0.0;

    if (t < 0.3) {
      // Early Phase: Hesitant, noisy, low energy
      const localT = t / 0.3;
      energy = mapRange(localT, 0, 1, 0.2, 0.5);
      noise = 1.0;
      structure = mapRange(localT, 0, 1, 0.0, 0.1);
      clarity = mapRange(localT, 0, 1, 0.2, 0.5);
      confidence = 0.1;
    } else if (t < 0.7) {
      // Middle Phase: Discovery, tension, higher energy
      const localT = (t - 0.3) / 0.4;
      energy = mapRange(smoothStep(localT), 0, 1, 0.5, 0.9);
      noise = mapRange(localT, 0, 1, 1.0, 0.4);
      structure = mapRange(localT, 0, 1, 0.1, 0.6);
      clarity = mapRange(localT, 0, 1, 0.5, 0.8);
      confidence = mapRange(localT, 0, 1, 0.1, 0.4);
    } else {
      // Final Phase: Resolution, coherence
      const localT = (t - 0.7) / 0.3;
      energy = mapRange(easeInOutQuad(localT), 0, 1, 0.9, 0.4); // Slows down into stability
      noise = mapRange(localT, 0, 1, 0.4, 0.05);
      structure = mapRange(localT, 0, 1, 0.6, 1.0);
      clarity = mapRange(localT, 0, 1, 0.8, 1.0);
      confidence = mapRange(localT, 0, 1, 0.4, 0.95);
    }

    return { energy, noise, structure, clarity, confidence, time: elapsed };
  };

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!startTimeRef.current) startTimeRef.current = time;
    let elapsed = time - startTimeRef.current;

    // Reset loop logic
    if (elapsed > DURATION_MS + FADE_OUT_DURATION) {
      startTimeRef.current = time;
      elapsed = 0;
      // Re-seed or slight randomize could happen here, but we'll keep state continuous
    }

    const state = getSystemState(elapsed);
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Fade trail effect - changes with clarity
    // Lower opacity rect = longer trails
    const trailOpacity = mapRange(state.clarity, 0, 1, 0.2, 0.4);
    ctx.fillStyle = `rgba(5, 5, 5, ${trailOpacity})`;
    ctx.fillRect(0, 0, width, height);

    // Global fade out at very end
    let masterAlpha = 1.0;
    if (elapsed > DURATION_MS) {
        masterAlpha = 1 - ((elapsed - DURATION_MS) / FADE_OUT_DURATION);
    }
    
    // Additive blending for glow
    ctx.globalCompositeOperation = 'lighter';

    const timeScale = time * 0.0005; // Base time speed for noise

    particlesRef.current.forEach(p => {
      // 1. Calculate Forces

      // Force A: Brownian Noise (Chaos)
      // Scale noise based on 'noise' parameter
      const noiseScale = 0.002;
      const nVal = noise3D(p.pos.x * noiseScale, p.pos.y * noiseScale, timeScale);
      const angle = nVal * Math.PI * 4;
      
      const noiseForceX = Math.cos(angle);
      const noiseForceY = Math.sin(angle);

      // Force B: The Structure (The Signal)
      // A flow field that converges into a ring/orbit pattern
      const dx = p.pos.x - centerX;
      const dy = p.pos.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angleToCenter = Math.atan2(dy, dx);
      
      // Tangent vector (orbit)
      const orbitX = -Math.sin(angleToCenter);
      const orbitY = Math.cos(angleToCenter);
      
      // Radial vector (attraction/repulsion)
      // Stabilizes at a radius of 300
      const targetRadius = Math.min(width, height) * 0.35;
      const distError = dist - targetRadius;
      const radialForce = -distError * 0.005; // Hooke's law-ish
      const radialX = Math.cos(angleToCenter) * radialForce;
      const radialY = Math.sin(angleToCenter) * radialForce;

      // Combine Structural Forces
      // Structure dictates how much we adhere to the orbit vs random wandering
      const structX = orbitX + radialX;
      const structY = orbitY + radialY;

      // Mix Forces based on state
      // When structure is 0, we only have noise. When 1, we interpret structure.
      const accX = (noiseForceX * state.noise) + (structX * state.structure);
      const accY = (noiseForceY * state.noise) + (structY * state.structure);

      p.acc.x += accX * 0.1 * state.energy;
      p.acc.y += accY * 0.1 * state.energy;

      // 2. Physics Update
      p.vel.x += p.acc.x;
      p.vel.y += p.acc.y;

      // Friction / Confidence
      // Higher confidence = higher drag/damping to stabilize motion
      const friction = 0.92 + (state.confidence * 0.06); 
      p.vel.x *= friction;
      p.vel.y *= friction;

      // Speed Limit (Energy modulates max speed)
      const maxSpeed = p.baseSpeed * (1 + state.energy * 2);
      const currSpeed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
      if (currSpeed > maxSpeed) {
        p.vel.x = (p.vel.x / currSpeed) * maxSpeed;
        p.vel.y = (p.vel.y / currSpeed) * maxSpeed;
      }

      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.acc.x = 0;
      p.acc.y = 0;

      // Wrap around edges if noise is high, else bounds might be soft
      // When stabilizing, we want them to stay in screen
      if (state.structure < 0.5) {
        if (p.pos.x < 0) p.pos.x = width;
        if (p.pos.x > width) p.pos.x = 0;
        if (p.pos.y < 0) p.pos.y = height;
        if (p.pos.y > height) p.pos.y = 0;
      }

      // 3. Render
      // Size pulsates slightly with energy
      const renderSize = p.size * (1 + Math.sin(time * 0.01 + p.id) * 0.2 * state.energy);
      
      // Alpha determined by clarity and life
      const lifePulse = 0.5 + 0.5 * Math.sin(time * 0.002 + p.life * 10);
      const particleAlpha = p.alpha * state.clarity * lifePulse * masterAlpha;

      if (particleAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, renderSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = particleAlpha;
        ctx.fill();
      }
    });

    // Reset composite operation for text
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw Connections (Structure Visualization)
    // Only if structure is high enough to 'see' connections
    if (state.structure > 0.6) {
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = `rgba(100, 200, 255, ${0.15 * state.clarity * masterAlpha})`;
        ctx.beginPath();
        // Optimization: Don't check all pairs. Just check standard deviation or nearest neighbors approximately
        // Actually, for 800 particles O(N^2) is too slow (640,000 checks).
        // Let's just connect particles to the center if they are close to the "Signal Ring"
        // Or connect to a random subset. 
        // Better: Connect subset of particles to their index neighbors (pseudo-connectivity)
        for(let i=0; i<particlesRef.current.length; i++) {
           if (i % 3 !== 0) continue; // Skip some
           const p1 = particlesRef.current[i];
           // Connect to next particle in array (simple chain effect that looks like complex networking)
           const p2 = particlesRef.current[(i + 1) % particlesRef.current.length];
           
           const distSq = (p1.pos.x - p2.pos.x)**2 + (p1.pos.y - p2.pos.y)**2;
           if (distSq < 10000) { // 100px distance
               ctx.moveTo(p1.pos.x, p1.pos.y);
               ctx.lineTo(p2.pos.x, p2.pos.y);
           }
        }
        ctx.stroke();
    }

    // Draw Text Overlay
    const activeMessage = TEXT_MESSAGES.find(m => elapsed >= m.start && elapsed <= m.end);
    if (activeMessage) {
        // Fade in/out logic for text
        const midpoint = (activeMessage.start + activeMessage.end) / 2;
        const distFromMid = Math.abs(elapsed - midpoint);
        const duration = activeMessage.end - activeMessage.start;
        // normalized 0 (center) to 1 (edges)
        const normDist = distFromMid / (duration / 2);
        const textAlpha = (1 - normDist) * masterAlpha;

        if (textAlpha > 0) {
            ctx.font = "200 14px 'Courier New', monospace";
            ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
            ctx.textAlign = 'center';
            ctx.fillText(activeMessage.text, width / 2, height - 100);
            
            // Tiny loading bar or decoration
            const barWidth = 40;
            ctx.fillRect((width/2) - (barWidth/2), height - 85, barWidth * state.confidence, 1);
        }
    }

    requestRef.current = requestAnimationFrame(draw);
  }, [getSystemState]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
            canvasRef.current.width = parent.clientWidth;
            canvasRef.current.height = parent.clientHeight;
            // Re-init particles on resize to fill space
            initParticles(parent.clientWidth, parent.clientHeight);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [draw, initParticles]);

  return (
    <div className="w-full h-full relative bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Optional: Static Noise Overlay for texture - purely CSS */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
           }}
      />
    </div>
  );
};

export default GenerativeSystem;
