import { SimState } from './sim';

export function render(ctx: CanvasRenderingContext2D, state: SimState) {
    const { width, height, stepCount, clusters, particles, hotspots, scanRadius } = state;

    // Trails: Clear with low opacity
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, width, height);

    // Global composition for additive blending effects
    ctx.globalCompositeOperation = 'lighter';

    // Draw Threads between clusters
    // "Threads should pulse deterministically (based on stepCount)."
    ctx.lineWidth = 1;
    for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
            const c1 = clusters[i];
            const c2 = clusters[j];
            
            // Distance check
            const dist = Math.sqrt((c1.x - c2.x)**2 + (c1.y - c2.y)**2);
            if (dist < width * 0.4) {
                const pulse = (Math.sin(stepCount * 0.05 + i * j) + 1) / 2; // 0 to 1
                const alpha = pulse * 0.4 * (1 - dist / (width * 0.4));
                
                ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                ctx.lineTo(c2.x, c2.y);
                ctx.stroke();
            }
        }
    }

    // Draw Hotspots
    for (let i = 0; i < hotspots.length; i++) {
        const h = hotspots[i];
        const pulse = Math.sin(stepCount * 0.1 + i);
        const alpha = 0.1 + (pulse + 1) * 0.05;
        
        const gradient = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
        if (h.strength > 0) {
            gradient.addColorStop(0, `rgba(50, 255, 100, ${alpha})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            gradient.addColorStop(0, `rgba(255, 50, 100, ${alpha})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Scan Ring
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.3)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 255, 200, 0.8)'; // required ctx.shadowColor
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, scanRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw Particles
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const c = clusters[p.clusterIndex];
        
        // Intensity based on life and scan proximity
        const distFromScan = Math.abs(Math.sqrt((p.x - width/2)**2 + (p.y - height/2)**2) - scanRadius);
        let alpha = p.life * 0.8;
        let size = 1.5;

        // Glow if hit by scan
        if (distFromScan < 10) {
            alpha = 1;
            size = 3;
            ctx.shadowBlur = 15; // required ctx.shadowBlur
            ctx.shadowColor = c.color;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = c.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Draw Clusters Centroids
    for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        ctx.shadowBlur = 20;
        ctx.shadowColor = c.color;
        ctx.fillStyle = c.color;
        
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Reset composite
    ctx.globalCompositeOperation = 'source-over';
}