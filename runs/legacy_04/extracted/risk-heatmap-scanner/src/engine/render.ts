import { EngineState, Node } from '../types';

export function render(ctx: CanvasRenderingContext2D, state: EngineState) {
    const { width, height, nodes, scanRings, hotspots } = state;

    // Trails must be implemented by drawing a transparent rect each frame
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, width, height);

    // Composite mode for glowing effects
    ctx.globalCompositeOperation = 'screen';

    // 1. Draw Threads (connections)
    // Only draw connections between active nodes or close nodes to create structure
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    // Optimization: Spatial hashing or simple distance check for a subset
    // We'll just do a simple check for demo purposes on a subset or cluster-based
    state.clusters.forEach(cluster => {
        const clusterNodes = nodes.filter(n => n.clusterId === cluster.id);
        for (let i = 0; i < clusterNodes.length; i++) {
            for (let j = i + 1; j < clusterNodes.length; j++) {
                const n1 = clusterNodes[i];
                const n2 = clusterNodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                const distSq = dx*dx + dy*dy;
                if (distSq < 6000) { // approx 80px
                    ctx.moveTo(n1.x, n1.y);
                    ctx.lineTo(n2.x, n2.y);
                }
            }
        }
    });
    ctx.stroke();

    // 2. Draw Scan Rings
    scanRings.forEach(ring => {
        if (ring.radius <= 0.1) return; // Skip invisible rings

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        // Gradient for the ring
        // Fix: Ensure inner radius is not negative
        const innerRadius = Math.max(0, ring.radius - 20);
        const grad = ctx.createRadialGradient(ring.x, ring.y, innerRadius, ring.x, ring.y, ring.radius);
        grad.addColorStop(0, "rgba(0, 255, 255, 0)");
        grad.addColorStop(0.8, "rgba(0, 255, 255, 0.2)");
        grad.addColorStop(1, "rgba(200, 255, 255, 0.8)");
        ctx.strokeStyle = grad;
        
        // Shadow blur requirements
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00FFFF";
        ctx.stroke();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
    });

    // 3. Draw Nodes
    nodes.forEach(node => {
        // Draw base node
        const isHot = node.riskLevel > 0.7;
        const isActive = node.active; // Lit by scan

        if (isActive || isHot) {
            const alpha = isActive ? 1 : 0.3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            
            if (isHot) {
                ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#FF0000";
            } else {
                ctx.fillStyle = `rgba(50, 150, 255, ${alpha})`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = "#0088FF";
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Dim passive nodes
            ctx.fillStyle = "rgba(100, 100, 100, 0.1)";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 4. Draw Hotspots (Explosions/Alerts)
    hotspots.forEach(spot => {
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, ${spot.intensity * 0.3})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 200, 100, ${spot.intensity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Reset composite
    ctx.globalCompositeOperation = 'source-over';
    
    // UI Overlay (Time)
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(`TIME: ${state.time.toFixed(2)}s`, 20, 30);
    ctx.fillText(`ENTITIES: ${nodes.length}`, 20, 50);
}