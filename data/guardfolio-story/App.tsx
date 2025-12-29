import React, { useState } from 'react';
import { StoryCanvas } from './components/StoryCanvas';
import { Overlay } from './components/Overlay';

export default function App() {
  const [currentPhase, setCurrentPhase] = useState<number>(1);

  return (
    <div className="relative w-full h-screen bg-[#050510] overflow-hidden">
      <StoryCanvas onPhaseChange={setCurrentPhase} />
      <Overlay phase={currentPhase} />
    </div>
  );
}