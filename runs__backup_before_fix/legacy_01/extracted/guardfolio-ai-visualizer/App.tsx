import React from 'react';
import GuardfolioVisualizer from './components/GuardfolioVisualizer';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      <GuardfolioVisualizer />
      
      {/* Persistent UI Elements */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10 pointer-events-none opacity-60">
        <h1 className="font-mono text-xs md:text-sm tracking-widest text-white uppercase">
          System Status: <span className="text-emerald-400">Monitoring</span>
        </h1>
        <div className="mt-1 h-0.5 w-12 bg-emerald-400/50"></div>
      </div>

      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-10 pointer-events-none opacity-40 text-right">
        <p className="font-mono text-[10px] md:text-xs text-white">
          RENDER_ENGINE_V2<br/>
          GUARDFOLIO_CORE
        </p>
      </div>
    </div>
  );
};

export default App;