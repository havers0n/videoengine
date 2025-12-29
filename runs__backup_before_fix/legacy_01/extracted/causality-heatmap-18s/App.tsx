import React from 'react';
import HeatmapCausalityCanvas from './components/HeatmapCausalityCanvas';

function App() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Container for the visualization with aspect ratio handling or full screen */}
      <div className="w-full h-full md:w-[95vw] md:h-[90vh] border border-slate-700 rounded-lg shadow-2xl overflow-hidden relative">
        <HeatmapCausalityCanvas />
      </div>
    </div>
  );
}

export default App;