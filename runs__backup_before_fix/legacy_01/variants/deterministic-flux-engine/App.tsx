import React, { useState, useCallback } from 'react';
import { CanvasAnimation } from './components/CanvasAnimation';
import { StatsOverlay } from './components/StatsOverlay';
import { CONFIG } from './constants';

const App: React.FC = () => {
  const [stats, setStats] = useState({ time: 0, fps: 0 });

  // Use callback to avoid re-creating the function, though CanvasAnimation is optimized
  const handleUpdateStats = useCallback((time: number, fps: number) => {
    // Only update state if values changed significantly to reduce React render overhead
    // or just let React handle it (it's fast enough for 2Hz updates).
    setStats({ time, fps });
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <StatsOverlay 
        time={stats.time} 
        fps={stats.fps} 
        particleCount={CONFIG.particleCount}
        completed={stats.time >= CONFIG.duration}
      />
      
      <CanvasAnimation onUpdateStats={handleUpdateStats} />
      
      {/* Decorative corners */}
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-xl pointer-events-none" />
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-fuchsia-500/30 rounded-tr-xl pointer-events-none" />
    </div>
  );
};

export default App;