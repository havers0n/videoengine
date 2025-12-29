import React, { useState } from 'react';
import RadarCanvas from './components/RadarCanvas';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 scanline opacity-30"></div>
      <div className="absolute inset-0 vignette"></div>
      
      {/* Main Radar Container */}
      <div className="relative w-full h-full max-w-5xl max-h-[90vh] aspect-square md:aspect-video flex items-center justify-center">
        <RadarCanvas isPlaying={isPlaying} onReplay={() => setIsPlaying(true)} />
      </div>

      {/* Footer Controls / Status */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 text-[#4affc3] text-xs uppercase opacity-60 font-mono tracking-widest z-20 pointer-events-none">
        <div>System: ONLINE</div>
        <div className="flex gap-4">
            <span>RDR-2094X</span>
            <span>FREQ: 44.20Hz</span>
        </div>
      </div>
    </div>
  );
};

export default App;