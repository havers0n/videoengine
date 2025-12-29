import React from 'react';
import CinematicAnimation from './components/CinematicAnimation';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <CinematicAnimation />
    </div>
  );
};

export default App;