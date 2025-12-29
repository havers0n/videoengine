import React, { useRef, useEffect, useState } from 'react';
import { ScannerHUD } from './components/ScannerHUD';
import { useScannerEngine } from './hooks/useScannerEngine';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentPhase, scanMetrics } = useScannerEngine(canvasRef, containerRef);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden font-mono">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full block"
      />
      
      {/* HUD Layer - Pointer events none to allow clicking through if needed, though mostly visual here */}
      <div className="absolute inset-0 pointer-events-none p-6 md:p-12 flex flex-col justify-between">
        <ScannerHUD phase={currentPhase} metrics={scanMetrics} />
      </div>
    </div>
  );
};

export default App;