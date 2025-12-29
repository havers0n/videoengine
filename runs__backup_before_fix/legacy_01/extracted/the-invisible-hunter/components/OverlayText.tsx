import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phase } from '../types';

interface OverlayTextProps {
  phase: Phase;
}

const OverlayText: React.FC<OverlayTextProps> = ({ phase }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
      <AnimatePresence mode="wait">
        {phase === Phase.BLIND_SPOT && (
          <motion.div
            key="text-blind"
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(5px)' }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="text-center"
          >
            <h1 className="text-gray-300 font-bold text-3xl md:text-5xl tracking-widest uppercase font-mono drop-shadow-lg">
              Рынок полон <br/><span className="text-white">слепых зон...</span>
            </h1>
          </motion.div>
        )}

        {phase === Phase.THE_TRAP && (
          <motion.div
            key="text-trap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-red-500 font-black text-4xl md:text-6xl tracking-[0.2em] uppercase font-sans glitch-effect drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
              ...И СКРЫТЫХ СВЯЗЕЙ.
            </h1>
          </motion.div>
        )}

        {phase === Phase.THE_MAP && (
          <motion.div
            key="text-map"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, type: 'spring' }}
            className="text-center bg-black/60 p-8 backdrop-blur-sm border-y border-cyan-500/30 w-full"
          >
            <motion.h1 
              initial={{ letterSpacing: '0.1em' }}
              animate={{ letterSpacing: '0.25em' }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="text-cyan-400 font-black text-4xl md:text-7xl uppercase font-sans drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]"
            >
              Guardfolio <span className="text-white">Sees All</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="text-cyan-100/70 text-lg md:text-xl mt-4 font-mono tracking-widest uppercase border-t border-cyan-900/50 inline-block pt-2"
            >
              Total Risk Clarity
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverlayText;
