import React from 'react';
import HudEngineCanvas from './components/HudEngineCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <HudEngineCanvas />
      
      {/* 
         Note: The prompt specifically requested NO DOM overlay text for the HUD.
         However, purely decorative UI borders or unrelated controls could go here.
         For this implementation, the HUD is entirely inside the Canvas component.
      */}
      
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-900 to-transparent opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-900 to-transparent opacity-50 pointer-events-none" />
    </div>
  );
};

export default App;