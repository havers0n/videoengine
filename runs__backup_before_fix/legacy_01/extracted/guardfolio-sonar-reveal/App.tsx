import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SonarCanvas from './components/SonarCanvas';
import { AnimationPhase } from './types';
import { ShieldCheck, AlertOctagon, Activity } from 'lucide-react';

const App = () => {
  const [phase, setPhase] = useState<AnimationPhase>(AnimationPhase.VOID);

  // Helper to get text based on phase
  const getContent = () => {
    switch (phase) {
      case AnimationPhase.VOID:
        return {
          title: "THE VOID",
          subtitle: "The market looks quiet.",
          color: "text-gray-400",
          icon: <Activity className="w-8 h-8 mb-4 opacity-50" />
        };
      case AnimationPhase.REVEAL:
        return {
          title: "THE REVEAL",
          subtitle: "Hidden risks are everywhere.",
          color: "text-red-500",
          icon: <AlertOctagon className="w-8 h-8 mb-4 animate-pulse text-red-500" />
        };
      case AnimationPhase.CLARITY:
        return {
          title: "GUARDFOLIO.AI",
          subtitle: "Total Visibility. Total Control.",
          color: "text-cyan-400",
          icon: <ShieldCheck className="w-8 h-8 mb-4 text-cyan-400" />
        };
    }
  };

  const content = getContent();

  return (
    <div className="relative w-screen h-screen bg-[#050505] overflow-hidden">
      {/* Background Animation */}
      <SonarCanvas onPhaseChange={setPhase} />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Cinematic Text Container */}
        <div className="text-center transition-all duration-1000 transform">
          
          {/* Icon */}
          <div className="flex justify-center transition-opacity duration-500">
            {content.icon}
          </div>

          {/* Main Headline */}
          <h1 className={`text-6xl md:text-8xl font-black tracking-tighter uppercase mb-4 transition-colors duration-700 ${content.color} antialiased drop-shadow-2xl`}>
            {content.title}
          </h1>

          {/* Subtitle */}
          <p className={`text-xl md:text-2xl font-light tracking-widest uppercase transition-opacity duration-700 ${phase === AnimationPhase.VOID ? 'text-gray-500' : 'text-white'} opacity-90`}>
             {content.subtitle}
          </p>

        </div>

        {/* Phase Indicator / Progress Bar at Bottom */}
        <div className="absolute bottom-12 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
             {/* Simple moving bar visualization based on phase */}
            <div 
              className={`h-full transition-all duration-300 ease-linear ${
                phase === AnimationPhase.CLARITY ? 'bg-cyan-500' : 
                phase === AnimationPhase.REVEAL ? 'bg-red-500' : 'bg-gray-500'
              }`}
              style={{
                width: '100%',
                transform: `translateX(${
                    phase === AnimationPhase.VOID ? '-66%' : 
                    phase === AnimationPhase.REVEAL ? '-33%' : '0%'
                })`
              }} 
            />
        </div>

        {/* Status Badge */}
        <div className="absolute top-12 right-12 flex items-center space-x-2 border border-gray-800 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            <div className={`w-2 h-2 rounded-full ${
                phase === AnimationPhase.CLARITY ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 
                phase === AnimationPhase.REVEAL ? 'bg-red-500 animate-ping' : 'bg-gray-400'
            }`} />
            <span className="text-xs font-mono text-gray-400 tracking-wider">
                SYSTEM STATUS: {phase}
            </span>
        </div>

      </div>

      {/* Vignette Overlay for atmosphere */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
};

export default App;
