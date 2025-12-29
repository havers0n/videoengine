import React from 'react';
import DarkPoolCanvas from './components/DarkPoolCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-[#050505] text-white overflow-hidden relative font-mono selection:bg-cyan-500 selection:text-black">
      <DarkPoolCanvas />
    </div>
  );
};

export default App;