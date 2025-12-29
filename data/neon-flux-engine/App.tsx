import React from 'react';
import CanvasEngine from './components/CanvasEngine';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      {/* Header / UI Layer */}
      <header className="absolute z-10 w-full p-6 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            NEON FLUX
          </h1>
          <p className="text-cyan-200/50 text-sm mt-1 tracking-wider">
            CANVAS 2D PHYSICS ENGINE
          </p>
        </div>
      </header>

      {/* Engine Container */}
      <main className="flex-grow relative">
        <CanvasEngine />
      </main>
    </div>
  );
};

export default App;
