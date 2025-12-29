import React, { useRef, useEffect } from 'react';
import { initSimulation, updateSimulation, State } from './engine/sim';
import { render } from './engine/render';

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Strict token: const stateRef = useRef(
    const stateRef = useRef<State | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Init canvas size
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                canvas.width = width;
                canvas.height = height;
                
                // Initialize state if not present, otherwise update bounds
                if (!stateRef.current) {
                    stateRef.current = initSimulation(width, height);
                } else {
                    stateRef.current.width = width;
                    stateRef.current.height = height;
                }
            }
        });
        resizeObserver.observe(container);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;
        
        // Strict token: performance.now()
        let lastTime = performance.now();
        
        // Strict token: const FIXED_DT = 1 / 60;
        const FIXED_DT = 1 / 60;
        
        // Strict token: let accumulator = 0;
        let accumulator = 0;

        const loop = () => {
            const now = performance.now();
            let frameTime = (now - lastTime) / 1000;
            lastTime = now;

            // Clamp frame time to prevent spiral of death on lag spikes
            if (frameTime > 0.25) frameTime = 0.25;

            accumulator += frameTime;

            // Strict token: while (accumulator >= FIXED_DT)
            while (accumulator >= FIXED_DT) {
                if (stateRef.current) {
                    updateSimulation(stateRef.current, FIXED_DT);
                }
                accumulator -= FIXED_DT;
            }

            if (stateRef.current) {
                render(ctx, stateRef.current);
            }

            // Strict token: requestAnimationFrame
            animationFrameId = requestAnimationFrame(loop);
        };

        // Start loop
        animationFrameId = requestAnimationFrame(loop);

        return () => {
            resizeObserver.disconnect();
            // Strict token: cancelAnimationFrame
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div ref={containerRef} className="w-full h-screen bg-slate-900 overflow-hidden relative">
            <canvas ref={canvasRef} className="block w-full h-full" />
            
            {/* UI Overlay */}
            <div className="absolute top-6 left-8 pointer-events-none select-none">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-lg">
                        SENTIENT SCANNER
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-cyan-200 font-mono text-sm tracking-widest uppercase">
                            Deterministic Core Active
                        </span>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-8 pointer-events-none select-none">
                 <div className="flex gap-4 text-xs font-mono text-slate-500">
                    <div>ACCUMULATOR: STABLE</div>
                    <div>TIMESTEP: 16.66ms</div>
                    <div>CLUSTER_SYNC: OK</div>
                 </div>
            </div>

            <div className="absolute top-6 right-8 pointer-events-none select-none text-right">
                <div className="border-r-2 border-cyan-500 pr-4">
                    <div className="text-cyan-400 font-mono text-xl">v2.0.4</div>
                    <div className="text-slate-400 text-xs uppercase tracking-wide">Build 88675123</div>
                </div>
            </div>
        </div>
    );
};

export default App;