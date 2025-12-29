import React from 'react';
import GuardfolioViz from './components/GuardfolioViz';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      <GuardfolioViz />
    </div>
  );
};

export default App;