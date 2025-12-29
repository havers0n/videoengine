
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createInitialState, updatePhysics, INTER_SECTOR_THRESHOLD, JITTER_PEAK } from './engine/physics';
import { Node, Sector, Thread } from './types';
import { getMarketAnalysis } from './services/gemini';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [analysis, setAnalysis] = useState("Initializing structural surveillance...");
  const [simulationData, setSimulationData] = useState<{
    nodes: Node[],
    sectors: Sector[],
    threads: Thread[]
  } | null>(null);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setSimulationData(createInitialState(width, height));
    
    const handleResize = () => {
       // Optional: Re-initialize or adjust positions on resize
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Analysis trigger
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isPaused) {
        const text = await getMarketAnalysis(progress);
        setAnalysis(text);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [progress, isPaused]);

  const animate = useCallback((time: number) => {
    if (!simulationData || isPaused) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx && canvas) {
      // 1. Trails persistence
      ctx.fillStyle = 'rgba(2, 6, 23, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Physics step
      updatePhysics(simulationData.nodes, simulationData.sectors, simulationData.threads, progress, 1);

      // 3. Draw Threads
      simulationData.threads.forEach(thread => {
        const isInter = thread.isInterSector;
        if (isInter && progress < INTER_SECTOR_THRESHOLD) return;

        const n1 = simulationData.nodes[thread.sourceId];
        const n2 = simulationData.nodes[thread.targetId];
        
        ctx.beginPath();
        ctx.moveTo(n1.pos.x, n1.pos.y);
        ctx.lineTo(n2.pos.x, n2.pos.y);
        
        if (isInter) {
          // Anomalous inter-sector links glow red
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + Math.random() * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        } else {
          ctx.strokeStyle = `rgba(100, 116, 139, 0.15)`;
          ctx.lineWidth = 0.5;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset for performance
      });

      // 4. Draw Nodes
      simulationData.nodes.forEach(node => {
        const sector = simulationData.sectors[node.sectorId];
        ctx.fillStyle = sector.color;
        ctx.beginPath();
        ctx.arc(node.pos.x, node.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Node halo
        ctx.fillStyle = `${sector.color}22`;
        ctx.beginPath();
        ctx.arc(node.pos.x, node.pos.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Update Progress Timeline
      setProgress(prev => {
        const next = prev + 0.0005;
        return next > 1 ? 0 : next;
      });
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [simulationData, isPaused, progress]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0 z-0"
      />

      {/* HUD Layer */}
      <div className="absolute top-0 left-0 w-full p-8 flex flex-col pointer-events-none">
        <div className="flex justify-between items-start w-full">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
              Market Structure Emergence
            </h1>
            <p className="text-slate-400 font-mono text-sm tracking-widest mt-1">
              PHYSICS-DRIVEN TOPOLOGY ENGINE // v2.4.0
            </p>
          </div>
          
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg backdrop-blur-md w-80 pointer-events-auto">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Quant Oracle Analysis</h3>
            <p className="text-sm text-slate-200 leading-relaxed italic">
              "{analysis}"
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-8 flex items-end justify-between pointer-events-none">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl backdrop-blur-md w-[500px] pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Structural Timeline</span>
            <span className="text-xs font-mono text-blue-400">{(progress * 100).toFixed(2)}%</span>
          </div>
          
          {/* Custom Timeline Slider */}
          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
            <div 
              className="absolute h-full bg-blue-500 transition-all duration-300 shadow-[0_0_10px_#3b82f6]" 
              style={{ width: `${progress * 100}%` }}
            />
            {/* Markers */}
            <div className="absolute top-0 left-[50%] w-0.5 h-full bg-red-500/50" title="Jitter Peak" />
            <div className="absolute top-0 left-[60%] w-0.5 h-full bg-yellow-500/50" title="Inter-sector Activation" />
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">State</p>
                <p className={`text-xs font-mono ${progress < 0.6 ? 'text-green-400' : 'text-red-400'}`}>
                  {progress < 0.6 ? 'SEGMENTED' : 'CORRELATED'}
                </p>
             </div>
             <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Entropic Force</p>
                <p className="text-xs font-mono text-white">
                  {(Math.max(0, 1 - Math.abs(progress - JITTER_PEAK) * 4) * 10).toFixed(2)}
                </p>
             </div>
             <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Playback</p>
                <button 
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors pointer-events-auto"
                >
                  {isPaused ? 'RESUME' : 'FREEZE'}
                </button>
             </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl backdrop-blur-md pointer-events-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Topology Key</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-slate-300 font-mono">Financials Cluster</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-300 font-mono">Tech Stability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-[1px] bg-red-500 shadow-[0_0_5px_red]" />
              <span className="text-[10px] text-slate-300 font-mono">Anomalous Threads (Risk)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
