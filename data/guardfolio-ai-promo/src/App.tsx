import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PromoCanvas } from './components/PromoCanvas';

const App: React.FC = () => {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    // Phase Timing Logic: 0-6s (Flow), 6-12s (Storm), 12-18s (Structure)
    const totalCycle = 18000;
    
    const interval = setInterval(() => {
      setPhase((prev) => {
        if (prev === 2) return 0;
        return prev + 1;
      });
    }, 6000); // Simple 6s segments

    return () => clearInterval(interval);
  }, []);

  // UI Variants for Framer Motion
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.8 }
  };

  const alertAnim = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: [1, 1.05, 1],
      color: ["#ef4444", "#ffffff", "#ef4444"],
      textShadow: ["0px 0px 10px rgba(239,68,68,0.5)", "0px 0px 20px rgba(239,68,68,1)", "0px 0px 10px rgba(239,68,68,0.5)"]
    },
    exit: { opacity: 0, filter: "blur(10px)" },
    transition: { 
      scale: { repeat: Infinity, duration: 0.5 },
      color: { repeat: Infinity, duration: 0.2 },
      opacity: { duration: 0.3 }
    }
  };

  const heroAnim = {
    initial: { opacity: 0, letterSpacing: "10px", filter: "blur(10px)" },
    animate: { opacity: 1, letterSpacing: "2px", filter: "blur(0px)" },
    exit: { opacity: 0 },
    transition: { duration: 1.5, ease: "easeOut" as const }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background Canvas */}
      <div className="absolute inset-0 z-0">
        <PromoCanvas phase={phase} />
      </div>

      {/* Foreground UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none">
        <AnimatePresence mode='wait'>
          
          {/* Phase 0: Flow - Minimal Info */}
          {phase === 0 && (
            <motion.div
              key="phase-0"
              className="absolute bottom-12 flex flex-col items-center gap-2"
              {...fadeIn}
            >
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-400 to-transparent" />
              <p className="text-sm font-mono tracking-widest text-slate-400 uppercase">
                Data Stream Initialized
              </p>
              <div className="flex gap-2 mt-2">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className="w-1 h-1 bg-slate-500 rounded-full animate-pulse" style={{animationDelay: `${i*0.2}s`}} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase 1: Storm - Critical Alert */}
          {phase === 1 && (
            <motion.div
              key="phase-1"
              className="flex flex-col items-center justify-center text-center"
              {...alertAnim}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-red-500">
                System Volatility
              </h1>
              <p className="text-xl md:text-2xl font-mono text-red-300 mt-2 bg-red-900/20 px-4 py-1">
                CRITICAL FAILURE IMMINENT
              </p>
            </motion.div>
          )}

          {/* Phase 2: Structure - Hero Restore */}
          {phase === 2 && (
            <motion.div
              key="phase-2"
              className="flex flex-col items-center justify-center text-center"
            >
              <motion.div {...heroAnim}>
                <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  GUARDFOLIO
                </h1>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent my-4" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
                <span className="text-cyan-100 font-mono tracking-widest text-lg">
                  STRUCTURE RESTORED
                </span>
                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Persistent UI Elements */}
        <div className="absolute top-8 right-8 font-mono text-xs text-slate-500 text-right">
           <div>SYS.V.2.0.4</div>
           <div>FPS: 60</div>
        </div>
      </div>
    </div>
  );
};

export default App;