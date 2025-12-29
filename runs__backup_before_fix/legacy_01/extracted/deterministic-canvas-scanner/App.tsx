import React from 'react';
import ScannerCanvas from './components/ScannerCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-gray-900 flex flex-col">
      <header className="bg-black/80 text-cyan-500 p-4 border-b border-cyan-900/30 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <h1 className="text-lg font-mono tracking-widest uppercase font-bold">Sys.Monitor_v18</h1>
        </div>
        <div className="text-xs font-mono text-gray-500">
          SECURE CONNECTION // DETERMINISTIC RNG
        </div>
      </header>
      
      <main className="flex-1 relative overflow-hidden">
        <ScannerCanvas />
      </main>
    </div>
  );
};

export default App;