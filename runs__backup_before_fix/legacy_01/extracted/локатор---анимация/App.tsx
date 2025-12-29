import React from 'react';
import SonarAnimation from './components/SonarAnimation';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-black"></div>
      
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 z-0" 
           style={{
             backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      <SonarAnimation />
    </div>
  );
};

export default App;