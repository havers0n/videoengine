import React, { useState } from 'react';
import StreamCanvas from './components/StreamCanvas';
import StatusOverlay from './components/StatusOverlay';
import { StreamPhase } from './types';

const App: React.FC = () => {
  const [phase, setPhase] = useState<StreamPhase>(StreamPhase.FLOW);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none">
      
      {/* Background Grid for depth */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-10" />

      {/* Scanlines CSS class defined in index.html */}
      <div className="scanlines z-50"></div>

      {/* The Particle System */}
      <StreamCanvas onPhaseChange={setPhase} />

      {/* The UI Layer */}
      <StatusOverlay phase={phase} />
      
    </div>
  );
};

export default App;