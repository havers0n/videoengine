import React from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-neutral-950 text-white">
      <SimulationCanvas />
    </div>
  );
};

export default App;