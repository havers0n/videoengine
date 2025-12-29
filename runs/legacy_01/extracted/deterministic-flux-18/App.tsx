import React, { useState, useEffect, useCallback } from 'react';
import { FixedStepCanvas } from './components/FixedStepCanvas';
import { Play, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [seed, setSeed] = useState(12345);
  const [progress, setProgress] = useState(0);

  // We track progress roughly via a timer here just for UI feedback, 
  // actual physics time is inside the canvas component.
  useEffect(() => {
    let interval: number;
    if (isPlaying && !isFinished) {
      const startTime = Date.now() - (progress * 18000);
      interval = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const p = Math.min(elapsed / 18, 1);
        setProgress(p);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isFinished]);

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
    setIsFinished(true);
    setProgress(1);
  }, []);

  const handleRestart = () => {
    setSeed(Date.now()); // New seed for variety, or keep same for deterministic replay
    setIsFinished(false);
    setIsPlaying(true);
    setProgress(0);
  };

  const getPhaseLabel = (p: number) => {
    if (p < 0.33) return "PHASE 1: CALM";
    if (p < 0.66) return "PHASE 2: INSTABILITY";
    return "PHASE 3: ORDER";
  };

  return (
    <div className="relative w-full h-screen bg-black text-white font-mono overflow-hidden">
      {/* Background Canvas */}
      <div className="absolute inset-0 z-0">
        <FixedStepCanvas 
          isPlaying={isPlaying} 
          onComplete={handleComplete} 
          seed={seed}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        {/* Header */}
        <div className="flex justify-between items-start animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              DETERMINISTIC FLUX
            </h1>
            <p className="text-xs text-gray-500 mt-1">18s Fixed-Step Simulation</p>
          </div>
          <div className="text-right">
             <div className="text-xl font-bold tabular-nums">
               {(progress * 18).toFixed(2)}s
             </div>
             <div className={`text-xs font-bold transition-colors duration-500 ${
               progress < 0.33 ? 'text-blue-400' : 
               progress < 0.66 ? 'text-red-400' : 'text-white'
             }`}>
               {getPhaseLabel(progress)}
             </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-900 mt-4 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Controls - Center Screen if idle/finished */}
        {(!isPlaying) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm transition-all">
            <div className="bg-gray-900/90 p-8 rounded-2xl border border-gray-800 shadow-2xl text-center max-w-md">
              <h2 className="text-3xl font-bold mb-4">
                {isFinished ? "Simulation Complete" : "Ready to Simulate"}
              </h2>
              <p className="text-gray-400 mb-8 text-sm">
                Experience a procedurally generated visual journey through three distinct states of matter.
                Running at 120Hz physics timestep.
              </p>
              
              <button 
                onClick={handleRestart}
                className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-indigo-600 font-lg rounded-lg hover:bg-indigo-500 hover:scale-105 focus:outline-none ring-offset-2 focus:ring-2 ring-indigo-400"
              >
                {isFinished ? (
                   <>
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Replay Simulation
                   </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Simulation
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;