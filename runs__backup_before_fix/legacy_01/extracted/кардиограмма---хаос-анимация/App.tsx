import React, { useState, useCallback, useMemo } from 'react';
import SignalCanvas from './components/SignalCanvas';
import { CRTOverlay } from './components/CRTOverlay';
import { SignalPhase } from './types';
import { Activity, Radio, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [phase, setPhase] = useState<SignalPhase>(SignalPhase.FLATLINE);
  const [progress, setProgress] = useState(0);

  const handlePhaseChange = useCallback((newPhase: SignalPhase, newProgress: number) => {
    setPhase(newPhase);
    setProgress(newProgress);
  }, []);

  // UI Configuration based on Phase
  const uiConfig = useMemo(() => {
    switch (phase) {
      case SignalPhase.FLATLINE:
        return {
          title: "Рыночный ритм спокоен.",
          sub: "MONITORING ACTIVE",
          color: "text-white",
          borderColor: "border-white/20",
          icon: <Activity className="w-6 h-6 animate-pulse" />,
          glitch: false
        };
      case SignalPhase.INTERFERENCE:
        return {
          title: "Шум скрывает аномалии.",
          sub: "WARNING: SIGNAL DISTORTION",
          color: "text-red-500",
          borderColor: "border-red-500/50",
          icon: <Radio className="w-6 h-6 animate-bounce" />,
          glitch: true
        };
      case SignalPhase.HARMONY:
        return {
          title: "Guardfolio. Чистый сигнал.",
          sub: "OPTIMIZATION COMPLETE",
          color: "text-cyan-400",
          borderColor: "border-cyan-400/50",
          icon: <ShieldCheck className="w-6 h-6" />,
          glitch: false
        };
      default:
        return { title: "", sub: "", color: "", borderColor: "", icon: null, glitch: false };
    }
  }, [phase]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-mono select-none">
      
      {/* Background Canvas */}
      <SignalCanvas onPhaseChange={handlePhaseChange} />
      
      {/* CRT Effects */}
      <CRTOverlay />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 text-xs text-white/40 tracking-widest uppercase">
        <div className="flex flex-col gap-1">
          <span>SYS.MSG_ID: {Math.floor(Date.now() / 1000)}</span>
          <span>MODE: {phase}</span>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span>FPS: 60</span>
          <span>BUFFER: {Math.floor(progress * 100)}%</span>
        </div>
      </div>

      {/* Main Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        
        {/* Dynamic Text Container */}
        <div className={`
          relative p-8 border-2 bg-black/40 backdrop-blur-sm transition-all duration-300
          flex flex-col items-center gap-4
          ${uiConfig.borderColor}
          ${uiConfig.glitch ? 'animate-shake' : ''}
        `}>
          
          {/* Icon */}
          <div className={`${uiConfig.color} transition-colors duration-300`}>
            {uiConfig.icon}
          </div>

          {/* Main Title */}
          <h1 className={`
            text-4xl md:text-6xl font-bold tracking-tighter text-center uppercase
            ${uiConfig.color}
            ${uiConfig.glitch ? 'glitch-text' : ''}
            transition-colors duration-500
          `}
          style={{ textShadow: `0 0 20px currentColor` }}
          >
            {uiConfig.title}
          </h1>

          {/* Subtitle */}
          <div className="w-full h-px bg-current opacity-30 my-2" />
          <p className={`text-sm tracking-[0.5em] ${uiConfig.color} opacity-80 uppercase`}>
            {uiConfig.sub}
          </p>

          {/* Decorative corners */}
          <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${uiConfig.borderColor} -mt-1 -ml-1`} />
          <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${uiConfig.borderColor} -mt-1 -mr-1`} />
          <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${uiConfig.borderColor} -mb-1 -ml-1`} />
          <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${uiConfig.borderColor} -mb-1 -mr-1`} />
        </div>

      </div>

      {/* Progress Bar Bottom */}
      <div className="absolute bottom-10 left-10 right-10 h-1 bg-white/10 z-10">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${uiConfig.color.replace('text-', 'bg-')}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Global Styles for Glitch Effect */}
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
        }
        .glitch-text {
          position: relative;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(children);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -1px 0 red;
          clip: rect(24px, 550px, 90px, 0);
          animation: glitch-anim-2 3s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: -1px 0 blue;
          clip: rect(85px, 550px, 140px, 0);
          animation: glitch-anim-1 2.5s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim-1 {
          0% { clip: rect(20px, 9999px, 15px, 0); }
          20% { clip: rect(50px, 9999px, 80px, 0); }
          40% { clip: rect(10px, 9999px, 90px, 0); }
          60% { clip: rect(80px, 9999px, 20px, 0); }
          80% { clip: rect(30px, 9999px, 60px, 0); }
          100% { clip: rect(60px, 9999px, 40px, 0); }
        }
        @keyframes glitch-anim-2 {
          0% { clip: rect(80px, 9999px, 30px, 0); }
          20% { clip: rect(10px, 9999px, 50px, 0); }
          40% { clip: rect(90px, 9999px, 10px, 0); }
          60% { clip: rect(15px, 9999px, 80px, 0); }
          80% { clip: rect(60px, 9999px, 20px, 0); }
          100% { clip: rect(5px, 9999px, 70px, 0); }
        }
      `}</style>
    </div>
  );
};

export default App;