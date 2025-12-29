import React from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { CONFIG } from './engine/types';

const App: React.FC = () => {
  const { isRunning, togglePause, reset, step, state, stats } = useGameLoop();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-4 flex flex-col md:flex-row gap-8">
      
      {/* LEFT: Internal State & Metrics */}
      <div className="flex-1 max-w-md space-y-6">
        <header className="border-b border-gray-700 pb-4">
          <h1 className="text-xl font-bold text-white mb-2">Deterministic Engine Core</h1>
          <p className="text-xs text-gray-400">
            Demonstrates fixed-timestep integration independent of frame rate.
          </p>
        </header>

        {/* Observable Variables Section */}
        <section className="bg-gray-800 p-4 rounded border border-gray-700">
          <h2 className="text-sm font-semibold text-blue-400 mb-4 uppercase tracking-wider">Observable State</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Tick Count:</span>
              <span className="text-white font-bold">{state.tick}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Position (Y):</span>
              <span className="text-green-400">{state.position.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Velocity (V):</span>
              <span className="text-yellow-400">{state.velocity.toFixed(4)}</span>
            </div>
          </div>
        </section>

        {/* Engine Internals Section */}
        <section className="bg-gray-800 p-4 rounded border border-gray-700">
          <h2 className="text-sm font-semibold text-purple-400 mb-4 uppercase tracking-wider">Engine Internals</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Fixed Timestep (dt):</span>
              <span className="text-gray-300">{CONFIG.FIXED_TIMESTEP_MS.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Accumulator:</span>
              <span className={`font-mono ${stats.accumulator > CONFIG.FIXED_TIMESTEP_MS ? 'text-red-500' : 'text-gray-300'}`}>
                {stats.accumulator.toFixed(2)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Est. Render FPS:</span>
              <span className="text-gray-300">{Math.round(stats.fps)}</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={togglePause}
            className={`p-3 rounded font-bold transition-colors ${
              isRunning 
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isRunning ? 'PAUSE' : 'START'}
          </button>
          
          <button 
            onClick={step}
            disabled={isRunning}
            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-bold"
            title="Advance exactly one fixed timestep"
          >
            STEP +1
          </button>
          
          <button 
            onClick={reset}
            className="p-3 bg-red-800 hover:bg-red-700 rounded text-white font-bold"
          >
            RESET
          </button>
        </div>

        <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
          <p>Logic updates at exactly {Math.round(1000/CONFIG.FIXED_TIMESTEP_MS)}Hz regardless of framerate.</p>
        </div>
      </div>

      {/* RIGHT: Minimal Visualization */}
      <div className="flex-1 bg-gray-950 rounded border border-gray-800 relative h-[400px] md:h-auto overflow-hidden">
        <div className="absolute top-2 left-2 text-xs text-gray-600">
          Visual verification of state (Y-axis)
        </div>
        
        {/* Floor */}
        <div 
            className="absolute left-0 right-0 border-t-2 border-gray-600 bg-gray-900/50"
            style={{ top: `${CONFIG.FLOOR_Y + 20}px`, bottom: 0 }} 
        >
            <div className="p-2 text-xs text-gray-500 text-right w-full">Floor (y={CONFIG.FLOOR_Y})</div>
        </div>

        {/* The Object */}
        <div 
          className="absolute left-1/2 -ml-4 w-8 h-8 bg-blue-500 border-2 border-blue-300 rounded-sm flex items-center justify-center text-[10px] text-white/50"
          style={{ 
            top: 20, // Offset for visuals
            transform: `translateY(${state.position}px)` 
          }}
        >
          OBJ
        </div>
        
        {/* Ghost/History Trail (Optional visual aid for path) */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-700 font-mono text-right">
             State is strictly coupled<br/>to `tick` count.
        </div>
      </div>
    </div>
  );
};

export default App;