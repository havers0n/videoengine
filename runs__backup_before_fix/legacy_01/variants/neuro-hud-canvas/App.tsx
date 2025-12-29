import React from 'react';
import { SciFiCanvas } from './components/SciFiCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <SciFiCanvas />
    </div>
  );
};

export default App;