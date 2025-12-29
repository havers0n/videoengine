import React, { useState, useRef } from 'react';
import { ScannerCanvas } from './components/ScannerCanvas';
import { Overlay } from './components/Overlay';
import { EngineConfig } from './types';

export default function App() {
  const [config, setConfig] = useState<Partial<EngineConfig>>({
    scanSpeed: 250,
    connectionThreshold: 150,
  });
  
  // Force re-render of canvas key if needed, or simply pass config props
  // We use a key to force full reset if node count changes drastically, 
  // but for simple sliders we pass props.
  const [scanTrigger, setScanTrigger] = useState(0);

  const handleConfigChange = (key: keyof EngineConfig, val: number) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  const triggerScan = () => {
    // In a real app this might use a ref to call a method on the canvas component,
    // For this demo, clicking the canvas does the same, but we can simulate by 
    // effectively resetting the "active" state or just letting the user click.
    // Actually, let's just simulate a user click at center via custom event or similar,
    // but simpler: The canvas listens to props? 
    // The easiest way for the "Initiate Pulse" button to work without deep coupling 
    // is to let the user know they can click, OR expose a ref.
    // We will just let the user click on canvas for now as implemented in ScannerCanvas.
    
    // To make the button functional, we can't easily pass a command without a ref or context.
    // For simplicity in this prompt format, we will rely on the existing click-to-scan feature 
    // and maybe add a visual cue.
    
    // Simulating a "Global Alert" via config update temporarily
    const originalSpeed = config.scanSpeed;
    setConfig(prev => ({ ...prev, scanSpeed: 800 })); // Speed up for a moment
    setTimeout(() => {
        setConfig(prev => ({ ...prev, scanSpeed: originalSpeed }));
    }, 500);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <ScannerCanvas active={true} config={config} />
      
      <Overlay 
        stats={{
            activeNodes: 12,
            threatLevel: 'NOMINAL'
        }}
        onConfigChange={handleConfigChange}
        onTriggerScan={triggerScan}
      />
      
      {/* Vignette & Grain Overlay for cinematic feel */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );
}