import React from 'react';
import ScannerCanvas from './components/ScannerCanvas';

const App: React.FC = () => {
  return (
    <main className="w-full h-screen bg-black text-white overflow-hidden">
      <ScannerCanvas />
    </main>
  );
};

export default App;