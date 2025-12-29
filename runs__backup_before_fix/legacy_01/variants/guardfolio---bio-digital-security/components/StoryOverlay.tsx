import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryOverlayProps {
  phase: 1 | 2 | 3;
}

const variants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, scale: 1.1, transition: { duration: 0.5, ease: "easeIn" } }
};

export const StoryOverlay: React.FC<StoryOverlayProps> = ({ phase }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      <AnimatePresence mode="wait">
        {phase === 1 && (
          <motion.div
            key="phase1"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)] tracking-wide">
              Портфель растет и дышит.
            </h1>
            <p className="mt-4 text-teal-200/60 text-lg uppercase tracking-widest font-mono">Organic Growth</p>
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div
            key="phase2"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] tracking-tight">
              Один риск заражает всё.
            </h1>
            <p className="mt-4 text-red-400/80 text-xl font-mono uppercase animate-pulse">Critical Contagion Alert</p>
          </motion.div>
        )}

        {phase === 3 && (
          <motion.div
            key="phase3"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center bg-black/40 backdrop-blur-sm p-12 rounded-3xl border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.3)]"
          >
            <h2 className="text-2xl text-blue-300 font-mono mb-2 tracking-widest">SYSTEM SECURED</h2>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
              <span className="text-blue-500">Guard</span>folio
            </h1>
            <p className="text-2xl text-blue-100 font-light">
              Изолируйте угрозы.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
