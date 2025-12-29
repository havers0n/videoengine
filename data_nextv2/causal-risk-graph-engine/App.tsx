import React from 'react';
import { CausalGraph } from './components/CausalGraph';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <CausalGraph />
      </main>
    </div>
  );
};

export default App;