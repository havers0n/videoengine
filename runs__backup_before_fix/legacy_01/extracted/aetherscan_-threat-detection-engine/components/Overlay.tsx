import React, { useState } from 'react';
import { EngineConfig } from '../types';

interface OverlayProps {
  stats: {
    activeNodes: number;
    threatLevel: string;
  };
  onConfigChange: (key: keyof EngineConfig, val: number) => void;
  onTriggerScan: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ stats, onConfigChange, onTriggerScan }) => {
  const [minimized, setMinimized] = useState(false);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between">
      {/* Header */}
      <header className="flex justify-between items-start pointer-events-auto">
        <div>
          <h1 className="text-cyan-400 text-2xl font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            AETHER<span className="text-white">SCAN</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-xs text-green-500 font-mono">SYSTEM ONLINE</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
            <div className="border border-cyan-900 bg-black/80 backdrop-blur-sm p-2 px-4 rounded-sm">
                <div className="text-[10px] text-cyan-600 uppercase mb-1">Threat Status</div>
                <div className={`text-xl font-mono font-bold ${stats.threatLevel === 'CRITICAL' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                    {stats.threatLevel}
                </div>
            </div>
        </div>
      </header>

      {/* Center Reticle (Decorative) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
         <div className="w-[400px] h-[400px] border border-cyan-500/30 rounded-full flex items-center justify-center">
            <div className="w-[300px] h-[300px] border border-dashed border-cyan-500/20 rounded-full animate-[spin_60s_linear_infinite]"></div>
         </div>
      </div>

      {/* Footer Controls */}
      <footer className="pointer-events-auto flex items-end gap-4">
        <div className={`transition-all duration-300 ${minimized ? 'w-12 h-12 overflow-hidden' : 'w-80'} border-l-2 border-cyan-600 bg-black/80 backdrop-blur-md p-4`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-cyan-500 text-sm font-bold uppercase tracking-wider">Engine Config</h3>
                <button onClick={() => setMinimized(!minimized)} className="text-cyan-700 hover:text-cyan-400">
                    {minimized ? '+' : '-'}
                </button>
            </div>
            
            {!minimized && (
                <div className="space-y-4 font-mono text-xs">
                    <div>
                        <div className="flex justify-between text-gray-400 mb-1">
                            <span>SCAN VELOCITY</span>
                            <span>High</span>
                        </div>
                        <input 
                            type="range" min="50" max="500" defaultValue="250" 
                            onChange={(e) => onConfigChange('scanSpeed', Number(e.target.value))}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between text-gray-400 mb-1">
                            <span>CONNECTION THRESHOLD</span>
                            <span>Wide</span>
                        </div>
                        <input 
                            type="range" min="50" max="300" defaultValue="150" 
                            onChange={(e) => onConfigChange('connectionThreshold', Number(e.target.value))}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    
                    <button 
                        onClick={onTriggerScan}
                        className="w-full mt-2 py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-colors uppercase font-bold tracking-widest"
                    >
                        INITIATE PULSE
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1"></div>

        <div className="text-right text-xs text-gray-600 font-mono">
             <div>COORDS: {Math.random().toFixed(4)} : {Math.random().toFixed(4)}</div>
             <div>MEM: 64MB // LATENCY: 12ms</div>
        </div>
      </footer>
    </div>
  );
};