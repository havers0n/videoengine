import React from 'react';
import ProceduralEngine from './components/ProceduralEngine';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      <ProceduralEngine />
      
      {/* Subtle overlay vignette to focus attention */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-60" />
    </div>
  );
};

export default App;