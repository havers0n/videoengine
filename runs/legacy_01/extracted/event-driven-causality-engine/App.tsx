
import React, { useEffect, useRef, useState } from 'react';
import { CausalityEngine } from './engine/CausalityEngine';
import { TimelineState, CausalityEventType } from './types';
import TimelineDisplay from './components/TimelineDisplay';
import { GeminiNarrator } from './services/geminiService';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CausalityEngine | null>(null);
  const [timelineState, setTimelineState] = useState<TimelineState | null>(null);
  const [aiNarration, setAiNarration] = useState<string>("Initializing deterministic manifold...");
  const lastNarrationEvent = useRef<CausalityEventType | null>(null);
  const narrator = useRef(new GeminiNarrator());

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CausalityEngine(canvasRef.current);
    engineRef.current = engine;

    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    engine.start();

    // The ONLY state update from RAF, throttled internally by frequency logic
    engine.onTimelineUpdate = (state) => {
      setTimelineState(state);
    };

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sync AI narration with events
  useEffect(() => {
    if (timelineState && timelineState.activeEvent.type !== lastNarrationEvent.current) {
      const currentType = timelineState.activeEvent.type;
      lastNarrationEvent.current = currentType;
      
      const updateNarration = async () => {
        const text = await narrator.current.getCausalityAnalysis(currentType);
        setAiNarration(text);
      };

      updateNarration();
    }
  }, [timelineState]);

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden select-none">
      {/* Background Layer */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-80"
      />

      {/* Narrative Header */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-10 pointer-events-none">
        <div className="flex flex-col items-center">
            <h1 className="text-sm font-bold tracking-[0.4em] uppercase text-slate-500 mb-4">
              Event-Driven Causality Engine v1.0
            </h1>
            <div className="relative w-full text-center">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 blur-xl opacity-50 rounded-full" />
                <p className="relative italic font-light text-slate-300 text-lg sm:text-2xl animate-pulse">
                  &ldquo;{aiNarration}&rdquo;
                </p>
            </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="fixed top-10 right-10 z-20 pointer-events-none hidden md:block">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm text-[10px] mono text-slate-500 uppercase">
          <div className="flex justify-between gap-8 mb-1">
            <span>Deterministic Seed</span>
            <span className="text-slate-300">42_MU32</span>
          </div>
          <div className="flex justify-between gap-8 mb-1">
            <span>Particles</span>
            <span className="text-slate-300">300_QTY</span>
          </div>
          <div className="flex justify-between gap-8 mb-1">
             <span>Thread Threshold</span>
             <span className="text-slate-300">DYN_VAR</span>
          </div>
           <div className="flex justify-between gap-8">
             <span>Gemini Sync</span>
             <span className="text-green-500">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Main UI Overlay */}
      <TimelineDisplay state={timelineState} />

      {/* Ambient Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(2,6,23,1)]" />
    </div>
  );
};

export default App;
