import React from 'react';
import SimCanvas from './components/SimCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <SimCanvas />
    </div>
  );
};

export default App;