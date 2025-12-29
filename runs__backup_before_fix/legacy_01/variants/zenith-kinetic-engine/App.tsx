
import React, { useState, useCallback, useRef } from 'react';
import { SystemPhase, EngineState } from './types';
import KineticCanvas from './components/KineticCanvas';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [engineState, setEngineState] = useState<EngineState>({
    phase: SystemPhase.DORMANT,
    energy: 0,
    particleCount: 800,
    cycleCount: 0,
  });

  const [autoCycle, setAutoCycle] = useState(false);

  const handlePhaseChange = useCallback((newPhase: SystemPhase) => {
    setEngineState(prev => ({ ...prev, phase: newPhase }));
  }, []);

  const handleEnergyUpdate = useCallback((energy: number) => {
    setEngineState(prev => ({ ...prev, energy }));
  }, []);

  const incrementCycle = useCallback(() => {
    setEngineState(prev => ({ ...prev, cycleCount: prev.cycleCount + 1 }));
  }, []);

  const manualBoost = useCallback(() => {
    if (engineState.phase === SystemPhase.DORMANT) {
      handlePhaseChange(SystemPhase.GATHERING);
    }
    handleEnergyUpdate(Math.min(100, engineState.energy + 15));
  }, [engineState.phase, engineState.energy, handlePhaseChange, handleEnergyUpdate]);

  const toggleAutoCycle = () => setAutoCycle(!autoCycle);

  return (
    <div className="relative w-full h-full bg-black select-none">
      {/* Visual Canvas Layer */}
      <KineticCanvas 
        phase={engineState.phase}
        energy={engineState.energy}
        onPhaseChange={handlePhaseChange}
        onEnergyUpdate={handleEnergyUpdate}
        onCycleComplete={incrementCycle}
        autoCycle={autoCycle}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="p-8 flex flex-col h-full justify-between">
          <header className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white opacity-90">
                ZENITH <span className="text-cyan-500">ENGINE</span>
              </h1>
              <p className="text-xs text-cyan-500/60 uppercase tracking-widest font-mono">
                State-Driven Visual Synthesis v2.1
              </p>
            </div>
            
            <div className="text-right font-mono">
              <div className="text-2xl text-white/40">{engineState.cycleCount.toString().padStart(4, '0')}</div>
              <div className="text-[10px] text-white/30 uppercase">Cycles Logged</div>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center">
             {/* Center display - Optional subtle label */}
             <div className="text-center">
                <div className={`text-6xl font-black transition-all duration-500 ${
                  engineState.phase === SystemPhase.DISCHARGE ? 'scale-150 text-white blur-sm' : 'text-white/10'
                }`}>
                  {engineState.phase}
                </div>
             </div>
          </main>

          <footer className="pointer-events-auto">
            <Dashboard 
              state={engineState} 
              onBoost={manualBoost} 
              onToggleAuto={toggleAutoCycle}
              autoCycle={autoCycle}
            />
          </footer>
        </div>
      </div>

      {/* Subtle scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,128,0.06))] bg-[length:100%_4px,3px_100%]"></div>
    </div>
  );
};

export default App;
