import React, { useState } from 'react';
import { BioCanvas } from './components/BioCanvas';
import { StoryOverlay } from './components/StoryOverlay';

const App: React.FC = () => {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans selection:bg-teal-500 selection:text-black">
      {/* Background Animation Layer */}
      <BioCanvas onPhaseChange={setPhase} />

      {/* Foreground UI/Text Layer */}
      <StoryOverlay phase={phase} />

      {/* Progress Bar (Optional, for debugging or viewer context) */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 z-50">
        <div 
           className="h-full bg-gradient-to-r from-teal-500 via-red-500 to-blue-500 transition-all duration-75 ease-linear"
           style={{ 
             width: '100%', 
             animation: `progress 18s linear infinite` 
           }} 
        />
      </div>
      
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default App;
