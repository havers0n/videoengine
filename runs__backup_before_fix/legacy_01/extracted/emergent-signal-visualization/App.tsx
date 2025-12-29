import React from 'react';
import GenerativeSystem from './components/GenerativeSystem';

const App: React.FC = () => {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white flex flex-col items-center justify-center">
      <GenerativeSystem />
      
      {/* Corner Metadata - Minimalist */}
      <div className="absolute top-6 left-8 font-mono text-xs text-white/30 tracking-widest select-none pointer-events-none">
        SYS.2025.V4
      </div>
      <div className="absolute bottom-6 right-8 font-mono text-xs text-white/30 tracking-widest select-none pointer-events-none">
        RENDER: CANVAS-2D
      </div>
    </main>
  );
};

export default App;
