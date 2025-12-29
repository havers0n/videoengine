import React from 'react';
import GravitationalSystem from './components/GravitationalSystem';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen overflow-hidden">
      <GravitationalSystem />
    </div>
  );
};

export default App;