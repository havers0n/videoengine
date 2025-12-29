import React from 'react';
import { ScannerPhase, COLORS } from '../constants';

interface HUDProps {
  phase: ScannerPhase;
  metrics: {
    threatLevel: number;
    entities: number;
    stability: number;
  };
}

export const ScannerHUD: React.FC<HUDProps> = ({ phase, metrics }) => {
  const getPhaseColor = () => {
    switch (phase) {
      case ScannerPhase.WARNING: return 'text-red-500 shadow-red-500/50';
      case ScannerPhase.LOCK_IN: return 'text-white shadow-white/50';
      case ScannerPhase.CALM: 
      default: return 'text-cyan-400 shadow-cyan-400/50';
    }
  };

  const colorClass = getPhaseColor();
  const borderColor = phase === ScannerPhase.WARNING ? 'border-red-500' : 'border-cyan-500';

  return (
    <>
      {/* Top Left: Risk Signal */}
      <div className="flex flex-col items-start gap-1">
        <div className={`flex items-center gap-3 border-l-4 pl-3 ${borderColor} transition-colors duration-300`}>
          <h1 className={`text-4xl font-bold tracking-tighter uppercase ${colorClass} drop-shadow-lg`}>
            RISK SIGNAL
          </h1>
          <div className={`w-3 h-3 rounded-full ${phase === ScannerPhase.WARNING ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`} />
        </div>
        <div className="pl-4">
          <p className="text-xs text-white/70 uppercase tracking-[0.2em] font-light">
            {phase === ScannerPhase.CALM && "STATUS: MONITORING SECTOR 7"}
            {phase === ScannerPhase.WARNING && "STATUS: ANOMALY DETECTED"}
            {phase === ScannerPhase.LOCK_IN && "STATUS: TARGET ACQUISITION"}
          </p>
          <p className="text-[10px] text-white/40 mt-1">
            SCANNING...
          </p>
        </div>
      </div>

      {/* Bottom Left: Metrics */}
      <div className="mt-auto">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
           <div className="text-white/50 uppercase text-[10px]">Threat Level</div>
           <div className={`font-bold text-right ${colorClass}`}>
             {(metrics.threatLevel * 100).toFixed(1)}%
           </div>
           
           <div className="text-white/50 uppercase text-[10px]">Entity Density</div>
           <div className="text-white/80 text-right font-mono">
             {Math.floor(metrics.entities)}
           </div>

           <div className="text-white/50 uppercase text-[10px]">Field Stability</div>
           <div className="text-white/80 text-right font-mono">
             {(metrics.stability * 100).toFixed(2)}
           </div>
        </div>
      </div>

      {/* Crosshairs Corner Decor */}
      <div className="absolute top-12 right-12 w-8 h-8 border-t-2 border-r-2 border-white/20" />
      <div className="absolute bottom-12 left-12 w-8 h-8 border-b-2 border-l-2 border-white/20" />
      
      {/* Center Reticle (only in Lock-in) */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white/10 rounded-full transition-opacity duration-1000 pointer-events-none flex items-center justify-center
        ${phase === ScannerPhase.LOCK_IN ? 'opacity-100' : 'opacity-0'}`}
      >
         <div className="w-[280px] h-[1px] bg-red-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
         <div className="h-[280px] w-[1px] bg-red-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    </>
  );
};