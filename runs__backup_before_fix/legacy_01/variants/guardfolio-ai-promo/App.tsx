import React from 'react';
import PromoAnimation from './components/PromoAnimation';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen relative bg-[#050510] text-white overflow-hidden">
      <PromoAnimation />
    </div>
  );
};

export default App;