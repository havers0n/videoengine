
import React, { useRef, useEffect } from 'react';
import { lerp, smoothstep, randomRange } from '../utils/math';

// --- TYPES ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  clusterId: number;
  baseColor: string;
  phaseOffset: number;
}

interface Cluster {
  id: number;
  centerX: number;
  centerY: number;
  targetCenterX: number;
  targetCenterY: number;
  color: string;
}

// --- CONSTANTS ---
const ANIMATION_DURATION = 18000;
const PARTICLE_COUNT = 140;
const CLUSTER_COUNT = 6;
const BASE_SPEED = 0.5;

const COLOR_PALETTE = {
  bg: '#020617', 
  neutral: '#94a3b8', 
  highlight: '#2dd4bf', 
  risk: '#f87171', 
  riskGlow: '#ef4444', 
  stableGlow: '#0d9488',
};

const GuardfolioViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    startTime: 0,
    particles: [] as Particle[],
    clusters: [] as Cluster[],
    width: 0,
    height: 0,
    animationFrameId: 0,
    textAlpha: 0,
    lineScale: 0,
  });

  const initSystem = (width: number, height: number) => {
    const particles: Particle[] = [];
    const clusters: Cluster[] = [];

    for (let i = 0; i < CLUSTER_COUNT; i++) {
      clusters.push({
        id: i,
        centerX: randomRange(width * 0.2, width * 0.8),
        centerY: randomRange(height * 0.2, height * 0.8),
        targetCenterX: 0,
        targetCenterY: 0,
        color: COLOR_PALETTE.neutral,
      });
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const clusterId = Math.floor(randomRange(0, CLUSTER_COUNT));
      const cluster = clusters[clusterId];
      const angle = randomRange(0, Math.PI * 2);
      const dist = randomRange(0, 70);
      
      particles.push({
        x: cluster.centerX + Math.cos(angle) * dist,
        y: cluster.centerY + Math.sin(angle) * dist,
        vx: randomRange(-1, 1),
        vy: randomRange(-1, 1),
        radius: randomRange(1.5, 3.5),
        clusterId: clusterId,
        baseColor: COLOR_PALETTE.neutral,
        phaseOffset: randomRange(0, 100),
      });
    }

    stateRef.current.particles = particles;
    stateRef.current.clusters = clusters;
    stateRef.current.width = width;
    stateRef.current.height = height;
  };

  const animate = (timestamp: number) => {
    const state = stateRef.current;
    if (!state.startTime) state.startTime = timestamp;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let elapsed = timestamp - state.startTime;
    if (elapsed > ANIMATION_DURATION) {
      elapsed = elapsed % ANIMATION_DURATION;
      state.startTime = timestamp - elapsed;
    }
    const t = elapsed / 1000;

    // --- LOGIC CURVES ---
    const phase2 = smoothstep(5, 7, t) - smoothstep(11, 13, t); 
    const noise = smoothstep(5, 9, t) * (1 - smoothstep(11, 14, t)); 
    const structure = smoothstep(11.5, 15, t); 
    const clarity = smoothstep(12.5, 16, t);
    const phase3 = structure; 
    const energy = lerp(0.3, 0.8, phase2) * (1 - phase3 * 0.5); 

    // --- CANVAS CLEAR ---
    ctx.fillStyle = COLOR_PALETTE.bg;
    ctx.fillRect(0, 0, state.width, state.height);

    // --- UPDATE CLUSTERS ---
    state.clusters.forEach((cluster, i) => {
        let tx, ty;
        if (structure > 0.1) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            tx = state.width * 0.3 + col * (state.width * 0.2);
            ty = state.height * 0.35 + row * (state.height * 0.25);
        } else {
            const timeScale = t * 0.45;
            const isRiskCluster = (i === 1 || i === 3);
            if (isRiskCluster && phase2 > 0.5) {
               tx = state.width * 0.5 + Math.sin(timeScale * 2.2 + i) * 60;
               ty = state.height * 0.5 + Math.cos(timeScale * 2.7 + i) * 60;
            } else {
               tx = state.width * 0.5 + Math.cos(timeScale + i * 132.1) * (state.width * 0.28);
               ty = state.height * 0.5 + Math.sin(timeScale * 0.85 + i * 12.5) * (state.height * 0.28);
            }
        }
        cluster.centerX = lerp(cluster.centerX, tx, 0.05);
        cluster.centerY = lerp(cluster.centerY, ty, 0.05);
    });

    // --- DRAW CONNECTIONS ---
    for (let i = 0; i < state.particles.length; i++) {
        const p1 = state.particles[i];
        for (let j = i + 1; j < state.particles.length; j++) {
            const p2 = state.particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx*dx + dy*dy;
            const threshold = phase2 > 0.5 ? 24000 : (structure > 0.5 ? 16000 : 9000); 

            if (distSq < threshold) {
                let strokeColor = 'rgba(148, 163, 184, 0.04)';
                if (structure > 0.5) {
                    strokeColor = `rgba(45, 212, 191, ${0.14 * clarity})`; 
                } else if (phase2 > 0.2) {
                    if (p1.clusterId !== p2.clusterId) {
                        strokeColor = `rgba(248, 113, 113, ${noise * 0.35})`; 
                    } else {
                        strokeColor = `rgba(148, 163, 184, 0.08)`;
                    }
                }
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }

    // --- DRAW PARTICLES ---
    state.particles.forEach(p => {
      const cluster = state.clusters[p.clusterId];
      const dx = cluster.centerX - p.x;
      const dy = cluster.centerY - p.y;
      const k = structure > 0.5 ? 0.09 : 0.038; 
      p.vx += dx * k; p.vy += dy * k;
      const noiseAmp = noise * 2.6; 
      p.vx += randomRange(-noiseAmp, noiseAmp);
      p.vy += randomRange(-noiseAmp, noiseAmp);
      const friction = structure > 0.5 ? 0.86 : 0.93;
      p.vx *= friction; p.vy *= friction;
      p.x += p.vx * BASE_SPEED * (1 + energy);
      p.y += p.vy * BASE_SPEED * (1 + energy);

      const isRiskCluster = (p.clusterId === 1 || p.clusterId === 3);
      let r = 148, g = 163, b = 184;
      if (structure > 0.5) {
          r = lerp(148, 45, clarity); g = lerp(163, 212, clarity); b = lerp(184, 191, clarity);
      } else if (phase2 > 0.1 && isRiskCluster) {
          const mix = smoothstep(0.2, 0.8, noise);
          r = lerp(148, 248, mix); g = lerp(163, 113, mix); b = lerp(184, 113, mix);
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      
      if (structure > 0.8) {
          ctx.shadowBlur = 12 * clarity; 
          ctx.shadowColor = COLOR_PALETTE.stableGlow;
      } else if (phase2 > 0.4 && isRiskCluster) {
          ctx.shadowBlur = 20 * noise; 
          ctx.shadowColor = COLOR_PALETTE.riskGlow;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // --- TEXT RENDERING (REFINED NATIVE SPACING) ---
    let currentText = "";
    let targetAlpha = 0;
    let targetLineScale = 0.2;

    if (t < 4.5) {
      currentText = "Seems stable...";
      targetAlpha = smoothstep(0.5, 1.5, t) * (1 - smoothstep(3.5, 4.5, t));
    } else if (t >= 5.5 && t < 11.5) {
      currentText = "Hidden relationships emerge";
      targetAlpha = smoothstep(5.5, 7, t) * (1 - smoothstep(10.5, 11.5, t));
    } else if (t >= 12.5) {
      currentText = "Guardfolio AI";
      targetAlpha = smoothstep(12.5, 14.5, t);
      targetLineScale = 1.0;
    }

    state.textAlpha = lerp(state.textAlpha, targetAlpha, 0.08);
    state.lineScale = lerp(state.lineScale, targetLineScale, 0.04);

    if (state.textAlpha > 0.01) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const fontSize = state.width < 768 ? 24 : 38;
      // Using system font stack for AI aesthetic
      ctx.font = `300 ${fontSize}px "Inter", "system-ui", "-apple-system", sans-serif`;
      
      // Fixing the spacing using native letterSpacing attribute
      const spacingValue = fontSize * 0.18;
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = `${spacingValue}px`;
      }

      // Backdrop shadow for legibility against busy particles
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(255, 255, 255, ${state.textAlpha})`;
      
      if (currentText === "Guardfolio AI") {
        ctx.shadowBlur = 20 * clarity;
        ctx.shadowColor = COLOR_PALETTE.highlight;
        // Layering twice for brightness
        ctx.fillText(currentText, state.width / 2, state.height / 2);
      }
      
      ctx.fillText(currentText, state.width / 2, state.height / 2);

      // Decorative animated underline
      const lineWidth = lerp(40, 160, state.lineScale);
      ctx.strokeStyle = `rgba(45, 212, 191, ${state.textAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(state.width / 2 - lineWidth / 2, state.height / 2 + (fontSize * 1.2));
      ctx.lineTo(state.width / 2 + lineWidth / 2, state.height / 2 + (fontSize * 1.2));
      ctx.stroke();
      
      ctx.restore();
    }

    // --- PROGRESS BAR ---
    ctx.fillStyle = `rgba(255, 255, 255, 0.12)`;
    ctx.fillRect(0, state.height - 2, state.width * (elapsed / ANIMATION_DURATION), 2);

    state.animationFrameId = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        initSystem(clientWidth, clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    stateRef.current.animationFrameId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(stateRef.current.animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default GuardfolioViz;
