import React from 'react';
import { ScannerSimulation } from './components/ScannerSimulation';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col bg-neutral-900 text-white overflow-hidden font-sans">
      <header className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
        <h1 className="text-xl font-bold tracking-wider text-cyan-400 opacity-80 uppercase">
          NeuroScan <span className="text-white text-xs align-middle bg-cyan-900 px-1 py-0.5 rounded">v1.0.4-beta</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Deterministic seeded environment • Canvas 2D Renderer
        </p>
      </header>

      <main className="flex-grow relative">
        <ScannerSimulation />
      </main>

      <footer className="absolute bottom-0 w-full p-4 text-center text-[10px] text-neutral-600 pointer-events-none">
        SYSTEM STATUS: ONLINE • THREAT LEVEL: MODERATE • SEED: 12345
      </footer>
    </div>
  );
};

export default App;