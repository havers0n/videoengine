import React from 'react';
import EngineCanvas from './components/EngineCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col">
      {/* 
        Header Section 
        Hidden on small screens to maximize canvas area, visible on large.
      */}
      <header className="hidden md:flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm absolute w-full z-10 top-0">
        <h1 className="text-slate-100 font-bold tracking-widest text-lg">
          SYSTEM_VISUALIZER <span className="text-teal-400 text-xs align-top">v1.0</span>
        </h1>
        <div className="text-right">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Deterministic State</p>
          <p className="text-slate-600 text-[10px]">Seed: 12345</p>
        </div>
      </header>

      {/* Main Content Area - Full Canvas */}
      <main className="flex-grow w-full h-full relative z-0">
        <EngineCanvas />
      </main>

      {/* 
        Footer Control/Status Bar 
        Sticky bottom for aesthetics
      */}
      <footer className="absolute bottom-6 w-full flex justify-center pointer-events-none z-10">
        <div className="bg-slate-900/80 backdrop-blur rounded-full px-6 py-2 border border-slate-800 flex gap-6 text-xs font-mono text-slate-300 shadow-xl shadow-black/50">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
             <span>LIVE_FEED</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-slate-600"></div>
             <span>LATENCY: 0ms</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
