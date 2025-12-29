import { SimState } from './state';
import { EngineParams } from '../config/params';

// Helper to interpolate colors
function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  
  return `rgb(${rr},${rg},${rb})`;
}

export function draw(ctx: CanvasRenderingContext2D, state: SimState) {
  const { width, height, clusters, threads, hotspots } = state;

  // Clear background
  ctx.fillStyle = EngineParams.BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  // Draw Hotspots (Faint fields)
  ctx.save();
  for (const h of hotspots) {
    const gradient = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, EngineParams.HOTSPOT_RADIUS);
    gradient.addColorStop(0, 'rgba(255, 42, 42, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 42, 42, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(h.pos.x, h.pos.y, EngineParams.HOTSPOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Draw Threads
  ctx.save();
  for (const t of threads) {
    const c1 = clusters.find(c => c.id === t.sourceId);
    const c2 = clusters.find(c => c.id === t.targetId);
    if (!c1 || !c2) continue;

    const tensionRatio = Math.min(1, t.tension / 20); // Normalize tension for display
    ctx.strokeStyle = lerpColor(EngineParams.COLOR_THREAD_RELAXED, EngineParams.COLOR_THREAD_TENSE, tensionRatio);
    ctx.lineWidth = 1 + tensionRatio * 2;
    ctx.globalAlpha = 0.5 + tensionRatio * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(c1.pos.x, c1.pos.y);
    ctx.lineTo(c2.pos.x, c2.pos.y);
    ctx.stroke();
  }
  ctx.restore();

  // Draw Clusters
  ctx.save();
  for (const c of clusters) {
    const stress = c.stress;
    const radius = EngineParams.CLUSTER_RADIUS + stress * 4;
    
    ctx.fillStyle = lerpColor(EngineParams.COLOR_SAFE, EngineParams.COLOR_RISK, stress);
    
    // Core
    ctx.beginPath();
    ctx.arc(c.pos.x, c.pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ring (Data visualizer style)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.pos.x, c.pos.y, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // ID Text (Tiny)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10px monospace';
    ctx.fillText(c.id.toString(), c.pos.x + 12, c.pos.y - 12);
  }
  ctx.restore();

  // Draw UI Overlay (Simulation Info)
  ctx.fillStyle = '#666';
  ctx.font = '12px monospace';
  ctx.fillText(`SIM TIME: ${state.time.toFixed(2)}`, 20, 30);
  ctx.fillText(`RISK FACTOR: ${(hotspots[0].speed * 10).toFixed(2)}`, 20, 45);
}