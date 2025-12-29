import React from 'react';
import GuardfolioVisualizer from './components/GuardfolioVisualizer';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-zinc-950 text-white overflow-hidden selection:bg-cyan-500/30">
      <GuardfolioVisualizer />
    </div>
  );
};

export default App;