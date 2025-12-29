import { State } from './sim';

export function render(ctx: CanvasRenderingContext2D, state: State) {
    const { width, height, clusters, particles, stepCount, scanRadius } = state;

    // Trails effect: Draw semi-transparent rectangle over previous frame
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)'; // Dark slate with alpha
    ctx.fillRect(0, 0, width, height);

    // Threads between clusters (Deterministic pulse)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = (Math.sin(stepCount * 0.05) + 1) / 2;
    
    for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
            const c1 = clusters[i];
            const c2 = clusters[j];
            const dx = c1.pos.x - c2.pos.x;
            const dy = c1.pos.y - c2.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 400) {
                // Gradient for threads
                const grad = ctx.createLinearGradient(c1.pos.x, c1.pos.y, c2.pos.x, c2.pos.y);
                grad.addColorStop(0, c1.color);
                grad.addColorStop(1, c2.color);

                ctx.beginPath();
                ctx.moveTo(c1.pos.x, c1.pos.y);
                ctx.lineTo(c2.pos.x, c2.pos.y);
                ctx.strokeStyle = grad;
                ctx.globalAlpha = (1 - dist/400) * 0.4 * pulse;
                ctx.lineWidth = 1 + pulse * 2;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    ctx.restore();

    // Scan Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(width/2, height/2, scanRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, 0.8 - scanRadius / (Math.max(width, height) * 0.8) )})`;
    ctx.lineWidth = 3;
    
    // Strict requirement tokens in usage
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f0ff';
    
    ctx.stroke();
    ctx.restore();

    // Clusters
    for (let c of clusters) {
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = c.color;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.mass / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Particles
    for (let p of particles) {
        // Highlight particles near scanner
        const distFromCenter = Math.sqrt((p.pos.x - width/2)**2 + (p.pos.y - height/2)**2);
        const distFromScan = Math.abs(distFromCenter - scanRadius);
        const isScanned = distFromScan < 30;
        
        ctx.fillStyle = isScanned ? '#ffffff' : p.color;
        const size = isScanned ? 3 : 1.5;
        
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, size, 0, Math.PI*2);
        ctx.fill();

        if (isScanned) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.fill();
            ctx.restore();
        }
    }
}