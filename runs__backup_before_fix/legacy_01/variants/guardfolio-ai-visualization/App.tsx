import React from 'react';
import { GenerativeSystem } from './components/GenerativeSystem';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#050505] text-white overflow-hidden relative">
      <GenerativeSystem />
    </div>
  );
};

export default App;