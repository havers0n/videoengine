import React, { useEffect, useState } from 'react';
import { StreamPhase } from '../types';
import { TEXT_CONFIG, COLORS } from '../constants';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

interface StatusOverlayProps {
  phase: StreamPhase;
}

const StatusOverlay: React.FC<StatusOverlayProps> = ({ phase }) => {
  const config = TEXT_CONFIG[phase];
  const [glitch, setGlitch] = useState(false);

  // Trigger a brief glitch effect on phase change
  useEffect(() => {
    setGlitch(true);
    const timeout = setTimeout(() => setGlitch(false), 300);
    return () => clearTimeout(timeout);
  }, [phase]);

  const getIcon = () => {
    switch (phase) {
      case StreamPhase.FLOW: return <Activity className="w-8 h-8 text-gray-200" />;
      case StreamPhase.TURBULENCE: return <Zap className="w-8 h-8 text-red-500 animate-pulse" />;
      case StreamPhase.CHANNELING: return <ShieldCheck className="w-8 h-8 text-cyan-500" />;
    }
  };

  const getColorClass = () => {
    switch (phase) {
      case StreamPhase.FLOW: return "text-gray-200 border-gray-500/30 bg-gray-900/40";
      case StreamPhase.TURBULENCE: return "text-red-500 border-red-500/50 bg-red-900/30";
      case StreamPhase.CHANNELING: return "text-cyan-400 border-cyan-500/50 bg-cyan-900/30";
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-8 sm:p-12 z-20">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className={`flex items-center gap-4 border-l-4 pl-4 transition-all duration-500 ${getColorClass()} border-l-current backdrop-blur-sm p-4 rounded-r-lg`}>
           <div className="animate-bounce-slow">
             {getIcon()}
           </div>
           <div>
             <h2 className="text-xs font-mono opacity-70 tracking-widest uppercase">System State</h2>
             <h1 className={`text-2xl font-bold font-mono tracking-tighter ${glitch ? 'translate-x-1' : ''}`}>
               {config.status}
             </h1>
           </div>
        </div>
        
        <div className="font-mono text-xs text-right opacity-50 hidden sm:block">
          <div>LATENCY: {phase === StreamPhase.TURBULENCE ? '420ms' : '12ms'}</div>
          <div>PACKET_LOSS: {phase === StreamPhase.TURBULENCE ? '14.2%' : '0.00%'}</div>
          <div>THROUGHPUT: {phase === StreamPhase.CHANNELING ? '1024 TB/s' : '512 TB/s'}</div>
        </div>
      </div>

      {/* Center Message (Only visible during transitions mostly, or persistent) */}
      <div className={`self-center text-center transition-opacity duration-500 ${phase === StreamPhase.FLOW ? 'opacity-0' : 'opacity-100'}`}>
         {phase === StreamPhase.TURBULENCE && (
            <div className="bg-red-950/80 border border-red-500 text-red-500 px-8 py-4 rounded shadow-[0_0_30px_rgba(239,68,68,0.4)] backdrop-blur-md">
                <p className="font-mono font-bold text-xl animate-pulse">⚠ CRITICAL INSTABILITY DETECTED</p>
            </div>
         )}
      </div>

      {/* Footer Description */}
      <div className="flex justify-center sm:justify-end items-end">
        <div className={`max-w-md backdrop-blur-md border rounded-lg p-6 transition-colors duration-700 ${getColorClass()}`}>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-2 border-b border-current pb-2 opacity-80">
            {config.title}
          </h3>
          <p className="font-mono text-sm leading-relaxed opacity-90">
            {glitch ? config.desc.split('').sort(()=> Math.random()-0.5).join('') : config.desc}
          </p>
          
          {/* Progress bar simulation */}
          <div className="mt-4 h-1 w-full bg-black/50 rounded overflow-hidden">
             <div 
               className="h-full bg-current transition-all duration-100 ease-linear"
               style={{ 
                 width: '100%',
                 animation: 'progress 1s infinite linear' 
                }}
             />
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default StatusOverlay;