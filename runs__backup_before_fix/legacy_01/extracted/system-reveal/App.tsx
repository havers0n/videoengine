import React from 'react';
import Visualization from './components/Visualization';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black text-white">
      <Visualization />
      
      {/* CRT Scanline Overlay Effect */}
      <div className="scanlines pointer-events-none absolute inset-0 z-50"></div>
      
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_80%,rgba(0,0,0,0.8)_100%)]"></div>
    </div>
  );
};

export default App;
