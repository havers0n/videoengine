import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CognitiveGraph from './components/CognitiveGraph';
import ControlPanel from './components/ControlPanel';
import ParticleInspector from './components/ParticleInspector';
import { Particle, CognitiveState, SimulationConfig } from './types';
import { updateParticleState } from './services/simulationRules';
import { generateCognitiveSeed } from './services/geminiService';
import { SIMULATION_WIDTH, SIMULATION_HEIGHT } from './constants';

const App: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedParticle, setSelectedParticle] = useState<Particle | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SimulationConfig>({
    decayRate: 0.001,
    learningRate: 0.01,
    uncertaintyVolatility: 0.02,
    autoSpawn: false,
  });

  // Use refs for the simulation loop to avoid dependency staleness
  const particlesRef = useRef<Particle[]>([]);
  particlesRef.current = particles;

  const configRef = useRef(config);
  configRef.current = config;

  // Initialize with some data
  useEffect(() => {
    const initialParticles: Particle[] = Array.from({ length: 5 }).map((_, i) => ({
      id: uuidv4(),
      text: `Init Node ${i}`,
      state: CognitiveState.PERCEPTION,
      confidence: Math.random() * 0.5 + 0.2,
      uncertainty: Math.random() * 0.5 + 0.2,
      decay: 0,
      age: 0,
      x: SIMULATION_WIDTH / 2 + (Math.random() - 0.5) * 100,
      y: SIMULATION_HEIGHT / 2 + (Math.random() - 0.5) * 100,
    }));
    setParticles(initialParticles);
  }, []);

  // Simulation Loop
  useEffect(() => {
    const tickRate = 100; // ms
    const interval = setInterval(() => {
      const currentParticles = particlesRef.current;
      const currentConfig = configRef.current;
      
      // Filter out completely decayed particles to keep performance up
      let activeParticles = currentParticles.filter(p => p.state !== CognitiveState.DECAYED || p.decay < 1.0);

      // Auto-spawn logic
      if (currentConfig.autoSpawn && Math.random() < 0.05 && activeParticles.length < 50) {
        activeParticles.push({
          id: uuidv4(),
          text: 'Random Thought',
          state: CognitiveState.IDLE,
          confidence: 0.1,
          uncertainty: 0.9,
          decay: 0,
          age: 0,
          x: SIMULATION_WIDTH / 2 + (Math.random() - 0.5) * 50,
          y: SIMULATION_HEIGHT / 2 + (Math.random() - 0.5) * 50,
        });
      }

      // Update state for each particle
      const nextParticles = activeParticles.map(p => {
        // Find neighbors (simple distance check or use D3 links if we had them)
        // For this engine, we simulate "local awareness" by checking distances
        const neighbors = activeParticles.filter(other => {
          if (other.id === p.id) return false;
          const dx = (p.x || 0) - (other.x || 0);
          const dy = (p.y || 0) - (other.y || 0);
          return Math.sqrt(dx * dx + dy * dy) < 100; // Interaction radius
        });

        return updateParticleState(p, neighbors, currentConfig);
      });

      setParticles(nextParticles);

      // Update selection if it still exists
      if (selectedParticle) {
        const updatedSelected = nextParticles.find(p => p.id === selectedParticle.id);
        if (updatedSelected) {
            setSelectedParticle(updatedSelected);
        } else {
            setSelectedParticle(null);
        }
      }

    }, tickRate);

    return () => clearInterval(interval);
  }, [selectedParticle]); 

  const handleInjectThought = async (topic: string) => {
    setLoading(true);
    const newThoughts = await generateCognitiveSeed(topic, 5);
    setLoading(false);

    const newParticles: Particle[] = newThoughts.map(t => ({
      id: uuidv4(),
      text: t.text || 'Unknown',
      state: t.state || CognitiveState.PERCEPTION,
      confidence: t.confidence || 0.5,
      uncertainty: t.uncertainty || 0.5,
      decay: 0,
      age: 0,
      x: SIMULATION_WIDTH / 2 + (Math.random() - 0.5) * 50,
      y: SIMULATION_HEIGHT / 2 + (Math.random() - 0.5) * 50,
    }));

    setParticles(prev => [...prev, ...newParticles]);
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden flex flex-col">
      <ControlPanel 
        config={config} 
        onConfigChange={setConfig} 
        onInjectThought={handleInjectThought}
        isLoading={loading}
      />
      
      <CognitiveGraph 
        particles={particles} 
        width={window.innerWidth} 
        height={window.innerHeight}
        onNodeClick={setSelectedParticle} 
      />

      <ParticleInspector 
        particle={selectedParticle} 
        onClose={() => setSelectedParticle(null)} 
      />
      
      {/* Legend / Status Footer */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-center">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-slate-700 flex gap-4 text-xs text-slate-400">
           <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span> Perception</div>
           <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#facc15]"></span> Analysis</div>
           <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fb923c]"></span> Synthesis</div>
           <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4ade80]"></span> Decision</div>
           <div className="ml-4 border-l border-slate-700 pl-4">Active Nodes: {particles.length}</div>
        </div>
      </div>
    </div>
  );
};

export default App;
