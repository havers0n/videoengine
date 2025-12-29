import React, { useState, useEffect } from 'react';
import { ReconstructionCanvas } from './components/ReconstructionCanvas';
import { PhaseConfig } from './types';
import { ShieldCheck, Database, Zap } from 'lucide-react';

const PHASES: PhaseConfig[] = [
  { label: "Данные разрозненны.", subLabel: "DISPERSION", startTime: 0, duration: 6000 },
  { label: "Столкновение интересов.", subLabel: "CRASH", startTime: 6000, duration: 6000 },
  { label: "Guardfolio. Фундаментальная защита.", subLabel: "ASSEMBLY", startTime: 12000, duration: 6000 },
];

function App() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Icon selector based on phase
  const getPhaseIcon = (phase: number) => {
    switch(phase) {
      case 0: return <Database className="w-8 h-8 text-gray-400 mb-2 animate-pulse" />;
      case 1: return <Zap className="w-8 h-8 text-red-500 mb-2 animate-bounce" />;
      case 2: return <ShieldCheck className="w-12 h-12 text-cyan-400 mb-2 animate-pulse" />;
      default: return null;
    }
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden font-sans select-none">
      
      {/* 3D Canvas Layer */}
      <ReconstructionCanvas 
        width={dimensions.width} 
        height={dimensions.height} 
        onPhaseChange={setCurrentPhase}
      />

      {/* Vignette & Grain Overlay for cinematic feel */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] z-10" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Text Overlay Layer */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
        
        {/* Dynamic Text Container */}
        <div className="relative h-32 w-full max-w-2xl flex flex-col items-center justify-center">
          {PHASES.map((phase, index) => (
            currentPhase === index && (
              <div key={index} className="absolute flex flex-col items-center animate-enter">
                {getPhaseIcon(index)}
                <h1 className={`text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent 
                  ${index === 0 ? 'bg-gradient-to-b from-white to-gray-500' : ''}
                  ${index === 1 ? 'bg-gradient-to-b from-red-500 to-orange-600' : ''}
                  ${index === 2 ? 'bg-gradient-to-b from-cyan-400 to-blue-600' : ''}
                `}>
                  {phase.label}
                </h1>
                <p className="mt-2 text-xs md:text-sm uppercase tracking-[0.2em] text-zinc-500">
                  {phase.subLabel} // {Math.round((index * 6) + (index === 2 ? 6 : 0))}s
                </p>
              </div>
            )
          ))}
        </div>

      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-1 bg-zinc-800 rounded-full overflow-hidden z-30">
         <div 
           className="h-full bg-white/20 transition-all duration-75 ease-linear"
           style={{ 
             width: `${((currentPhase * 6000) / 18000) * 100}%`,
             // We can animate this more smoothly in the canvas, but this is a rough phase indicator
           }}
         />
         {/* Animated bar within phase */}
         <div 
           className={`h-full absolute top-0 left-0 
            ${currentPhase === 0 ? 'bg-gray-500' : currentPhase === 1 ? 'bg-red-500' : 'bg-cyan-500'}
           `}
           style={{
             animation: 'progress 6s linear infinite',
             width: '100%',
             transformOrigin: 'left'
           }}
         />
         <style>{`
           @keyframes progress {
             0% { transform: scaleX(0); }
             100% { transform: scaleX(1); }
           }
         `}</style>
      </div>

    </div>
  );
}

export default App;
