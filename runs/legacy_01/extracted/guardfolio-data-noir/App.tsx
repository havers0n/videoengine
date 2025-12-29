import React from 'react';
import PromoAnimation from './components/PromoAnimation';

const App: React.FC = () => {
  return (
    <main className="w-screen h-screen bg-black text-white overflow-hidden">
      {/* 
        The PromoAnimation component is designed to fill its parent.
        We give it the full screen here.
      */}
      <PromoAnimation />
    </main>
  );
};

export default App;