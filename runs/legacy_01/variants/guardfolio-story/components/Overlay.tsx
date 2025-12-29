import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { COLORS } from '../types';

interface OverlayProps {
  phase: number;
}

export const Overlay: React.FC<OverlayProps> = ({ phase }) => {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      
      {/* BACKGROUND TEXT FOR PHASE 2 */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1.1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <h1 className="text-[15vw] font-black tracking-tighter text-red-600 opacity-20 blur-sm select-none">
              RISK
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOREGROUND TEXT CONTENT */}
      <div className="relative z-20 text-center max-w-4xl px-6">
        <AnimatePresence mode="wait">
          
          {/* PHASE 1: ILLUSION */}
          {phase === 1 && (
            <motion.div
              key="phase1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center"
            >
              <h2 
                className="text-4xl md:text-5xl font-light text-cyan-100 tracking-wide"
                style={{ textShadow: `0 0 20px ${COLORS.BLUE}` }}
              >
                Ваш портфель выглядит стабильным...
              </h2>
            </motion.div>
          )}

          {/* PHASE 2: REVEAL */}
          {phase === 2 && (
            <motion.div
              key="phase2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ 
                opacity: 1, 
                x: [0, -5, 5, -2, 2, 0], // Shake effect
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-red-500 uppercase tracking-widest mb-4 font-mono">
                WARNING
              </h2>
              <p className="text-2xl md:text-3xl text-red-200 font-medium">
                Но скрытые риски тянут его вниз.
              </p>
            </motion.div>
          )}

          {/* PHASE 3: RESOLUTION */}
          {phase === 3 && (
            <motion.div
              key="phase3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ 
                  boxShadow: ["0 0 0px #00ff9d", "0 0 30px #00ff9d", "0 0 0px #00ff9d"],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="bg-emerald-900/30 p-6 rounded-full border border-emerald-500/50 mb-6 backdrop-blur-md"
              >
                <ShieldCheck size={64} className="text-emerald-400" />
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
                Guardfolio
              </h1>
              <div className="h-1 w-24 bg-emerald-500 rounded-full mb-6"></div>
              <p className="text-xl md:text-2xl text-emerald-200 font-light tracking-widest uppercase">
                Ясность вместо хаоса
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Progress Bar (Bottom) */}
      <div className="absolute bottom-10 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
            className="h-full"
            style={{ 
                backgroundColor: phase === 1 ? '#00f0ff' : phase === 2 ? '#ff2a2a' : '#00ff9d' 
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
        />
      </div>
    </div>
  );
};