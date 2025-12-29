import React from 'react';
import EngineCanvas from './components/EngineCanvas';

const App: React.FC = () => {
  return (
    <main className="w-screen h-screen bg-[#050505] flex items-center justify-center">
      {/* 
        Container for the Engine. 
        Using w-screen/h-screen to immersive experience.
      */}
      <div className="w-full h-full relative">
        <EngineCanvas />
        
        {/* UI Overlay */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center pointer-events-none">
           <div className="bg-black/40 backdrop-blur-md border border-[#00f2ff]/20 px-6 py-3 rounded-full text-[#00f2ff] font-mono text-sm tracking-widest shadow-[0_0_15px_rgba(0,242,255,0.1)]">
              NEURO // GLITCH // SIMULATION
           </div>
        </div>
      </div>
    </main>
  );
};

export default App;