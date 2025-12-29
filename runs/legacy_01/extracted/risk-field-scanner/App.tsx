import React from 'react';
import ScannerCanvas from './components/ScannerCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-[#02040a] text-cyan-400 overflow-hidden font-mono">
      {/* Background/Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <ScannerCanvas />
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-widest uppercase border-b border-cyan-500/30 pb-2 mb-2 text-cyan-100 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              Risk Field Scanner
            </h1>
            <p className="text-xs text-cyan-600 tracking-wider">
              SYSTEM STATUS: <span className="text-green-400 animate-pulse">ACTIVE</span>
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-cyan-800">COORDINATES</div>
            <div className="text-sm">X: 42.103 Y: 99.201</div>
          </div>
        </header>

        {/* Footer */}
        <footer className="flex justify-between items-end opacity-70">
          <div className="border-l-2 border-cyan-600 pl-4">
            <div className="text-[10px] uppercase text-cyan-700 mb-1">Modules</div>
            <div className="text-xs">
              <div>[✓] THREAD TRACKING</div>
              <div>[✓] FORCE FIELD</div>
              <div>[✓] ANOMALY DETECTION</div>
            </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] text-cyan-800">V.2.0.4</div>
          </div>
        </footer>
      </div>

      {/* Decorative Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
};

export default App;