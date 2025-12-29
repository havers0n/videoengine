import { EngineState } from '../../types';

export function render(ctx: CanvasRenderingContext2D, state: EngineState) {
  const { width, height, time, scannerAngle, particles, hotspots } = state;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDim = Math.max(width, height);

  // Trails must be implemented by drawing a transparent rect each frame
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, 0, width, height);

  // 1. Draw Threads & Clusters
  ctx.lineWidth = 1;
  for (const p of particles) {
    const isRisk = p.color === '#ef4444';
    
    // Draw connections
    for (const connIdx of p.connections) {
        const p2 = particles[connIdx];
        if (!p2) continue;
        
        const dist = Math.hypot(p.pos.x - p2.pos.x, p.pos.y - p2.pos.y);
        const opacity = Math.max(0, 1 - dist / 150);
        
        if (opacity > 0) {
            ctx.strokeStyle = isRisk ? `rgba(239, 68, 68, ${opacity * 0.3})` : `rgba(14, 165, 233, ${opacity * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(p.pos.x, p.pos.y);
            ctx.lineTo(p2.pos.x, p2.pos.y);
            ctx.stroke();
        }
    }

    // Draw particle
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, isRisk ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // 2. Draw Hotspots with Shadow Blur
  for (const h of hotspots) {
    if (h.intensity > 0.01) {
      const alpha = h.intensity * 0.6;
      const riskColor = `rgba(255, 60, 0, ${alpha})`; // Intense Orange/Red
      
      ctx.save();
      // Shadow blur must be used with these exact properties
      ctx.shadowBlur = 40 * h.intensity;
      ctx.shadowColor = "rgba(255, 100, 50, 0.8)";
      
      ctx.beginPath();
      ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
      ctx.fillStyle = riskColor;
      ctx.fill();
      
      // Inner core
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(255, 255, 255, ${h.intensity})`;
      ctx.beginPath();
      ctx.arc(h.pos.x, h.pos.y, h.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 3. Draw Scan Ring & Radar Sweep
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Gradients
  const gradient = ctx.createConicGradient(scannerAngle - Math.PI/2, 0, 0);
  gradient.addColorStop(0, "rgba(0, 255, 200, 0)");
  gradient.addColorStop(0.1, "rgba(0, 255, 200, 0.0)");
  gradient.addColorStop(0.25, "rgba(0, 255, 200, 0.2)"); // Trail
  gradient.addColorStop(0.255, "rgba(200, 255, 255, 0.8)"); // Leading edge white
  gradient.addColorStop(0.26, "rgba(0, 255, 200, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, maxDim * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Scan line
  ctx.rotate(scannerAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(maxDim, 0);
  ctx.strokeStyle = "rgba(0, 255, 200, 0.5)";
  ctx.lineWidth = 2;
  // Shadow blur for the laser line
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#00ffcc";
  ctx.stroke();

  ctx.restore();

  // 4. Draw Overlay Grid (Static aesthetic)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  const gridSize = 100;
  
  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
  }
  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
  }

  // UI Text
  ctx.font = "14px monospace";
  ctx.fillStyle = "#00ffcc";
  ctx.fillText(`SCAN_TIME: ${time.toFixed(2)}s`, 20, 30);
  ctx.fillText(`THREAT_LEVEL: DETECTING...`, 20, 50);
}
