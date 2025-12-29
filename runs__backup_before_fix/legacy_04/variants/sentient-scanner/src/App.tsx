import React, { useEffect, useRef, useState } from 'react';
import { initSim, updateSim, SimState } from './engine/sim';
import { render } from './engine/render';

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // stateRef name must be exactly stateRef per requirements
    const stateRef = useRef<SimState | null>(null);
    const requestRef = useRef<number>();
    
    // UI state for display only (fps, etc)
    const [fps, setFps] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize dimensions
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Initialize State Deterministically
        stateRef.current = initSim(width, height);

        // Deterministic Time Steps
        // "const FIXED_DT = 1 / 60;"
        const FIXED_DT = 1 / 60;
        // "let accumulator = 0;"
        let accumulator = 0;
        let lastTime = performance.now();
        let frameCount = 0;
        let lastFpsTime = lastTime;

        const animate = (time: number) => {
            // "performance.now()" usage implies passing time or calling it here.
            // rAF passes time, but for delta we can use performance.now() to be explicit as requested.
            const now = performance.now();
            const frameTime = (now - lastTime) / 1000;
            lastTime = now;

            // Cap frameTime to avoid spiral of death
            const safeFrameTime = Math.min(frameTime, 0.25);
            
            accumulator += safeFrameTime;

            // "while (accumulator >= FIXED_DT)"
            while (accumulator >= FIXED_DT) {
                if (stateRef.current) {
                    updateSim(stateRef.current, FIXED_DT);
                    
                    // Reset if duration exceeded (18s) to keep it interesting
                    if (stateRef.current.stepCount * FIXED_DT > stateRef.current.duration) {
                         // Optional: loop or stop. Let's loop scan.
                         stateRef.current.scanRadius = 0;
                         stateRef.current.stepCount = 0;
                    }
                }
                accumulator -= FIXED_DT;
            }

            if (stateRef.current) {
                render(ctx, stateRef.current);
            }

            // FPS Counter
            frameCount++;
            if (now - lastFpsTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastFpsTime = now;
            }

            // "requestAnimationFrame"
            requestRef.current = requestAnimationFrame(animate);
        };

        // Start Loop
        requestRef.current = requestAnimationFrame(animate);

        return () => {
             // "cancelAnimationFrame"
             if (requestRef.current) {
                 cancelAnimationFrame(requestRef.current);
             }
        };
    }, []);

    return (
        <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
            <canvas ref={canvasRef} className="block" />
            
            <div className="absolute top-4 left-4 pointer-events-none select-none">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 font-mono tracking-tighter filter drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                    SENTIENT SCANNER v2
                </h1>
                <div className="mt-2 text-xs font-mono text-cyan-700/80 space-y-1">
                    <p>DETERMINISTIC ENGINE ACTIVE</p>
                    <p>FPS: {fps}</p>
                    <p>ENTITIES: {stateRef.current?.particles.length || 0}</p>
                    <p>CLUSTERS: {stateRef.current?.clusters.length || 0}</p>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/20 animate-pulse">
                    Scanning Neural Topography
                </div>
                <div className="w-64 h-1 bg-gray-800 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500/50 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>
        </div>
    );
};

export default App;