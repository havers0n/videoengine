import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import SonarCanvas from './components/SonarCanvas';
import OverlayText from './components/OverlayText';
import { TIMING } from './constants';
import { Phase } from './types';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [phase, setPhase] = useState<Phase>(Phase.BLIND_SPOT);
  
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    
    // Calculate raw elapsed time
    const rawElapsed = time - startTimeRef.current + pausedTimeRef.current;
    
    // Cap at total duration
    const currentElapsed = Math.min(rawElapsed, TIMING.TOTAL_DURATION);
    setElapsedTime(currentElapsed);

    // Determine Phase
    if (currentElapsed < TIMING.PHASE_1_DURATION) {
      setPhase(Phase.BLIND_SPOT);
    } else if (currentElapsed < TIMING.PHASE_1_DURATION + TIMING.PHASE_2_DURATION) {
      setPhase(Phase.THE_TRAP);
    } else if (currentElapsed < TIMING.TOTAL_DURATION) {
      setPhase(Phase.THE_MAP);
    } else {
        // Animation complete
        setPhase(Phase.THE_MAP); // Stay on map
        setIsPlaying(false);
        return; 
    }

    if (currentElapsed < TIMING.TOTAL_DURATION) {
        requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      // Need to reset start time reference on play to account for current tick
      startTimeRef.current = performance.now() - elapsedTime; 
      pausedTimeRef.current = 0; // Reset this as we've factored it into startTime
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // We don't need to track pausedTimeRef here because we use state `elapsedTime` 
      // when resuming in the logic above
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const handleRestart = () => {
    setIsPlaying(false);
    setElapsedTime(0);
    setPhase(Phase.BLIND_SPOT);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setTimeout(() => setIsPlaying(true), 100);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor((ms % 1000) / 10);
    return `00:${s.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`;
  };

  // Auto-start
  useEffect(() => {
    handleRestart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono select-none">
      {/* Background/Canvas Layer */}
      <SonarCanvas phase={phase} elapsedTime={elapsedTime} isPlaying={isPlaying} />

      {/* Text Layer */}
      <OverlayText phase={phase} />

      {/* UI Controls (HUD) */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-white/50 text-xs tracking-widest uppercase">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            System Status: {isPlaying ? 'RECORDING' : 'STANDBY'}
          </div>
          <div className="text-white/80 text-xl font-bold tracking-tighter">
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-cyan-500/50 text-[10px] tracking-[0.2em]">GUARDFOLIO TACTICAL MAP</div>
          <div className="text-white/30 text-[10px]">SECURE CONNECTION // ENCRYPTED</div>
        </div>
      </div>

      {/* Footer / Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-30">
        <div className="w-full h-1 bg-gray-900">
            <div 
                className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" 
                style={{ width: `${(elapsedTime / TIMING.TOTAL_DURATION) * 100}%` }}
            />
        </div>
        <div className="flex justify-between items-end p-6">
            <div className="text-xs text-white/20 max-w-[200px] leading-relaxed">
                COORDINATES: {Math.floor(elapsedTime * 0.123)} , {Math.floor(elapsedTime * 0.456)} <br/>
                SECTOR: 7G-ALPHA
            </div>
            
            {/* Interactive Controls */}
            <div className="pointer-events-auto flex gap-4">
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 backdrop-blur-sm group"
                >
                    <Play className={`w-5 h-5 ${isPlaying ? 'opacity-50' : 'fill-white'}`} />
                </button>
                <button 
                    onClick={handleRestart}
                    className="p-3 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/30 backdrop-blur-sm group"
                >
                    <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;