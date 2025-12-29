import React, { useState, useEffect, useRef, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import { SimulationEngine } from './simulation/engine';
import { WorldConfig, AgentData } from './types';
import { generateScenarioConfig } from './services/geminiService';

const DEFAULT_CONFIG: WorldConfig = {
  seed: "initial-seed",
  width: window.innerWidth - 384, // Sidebar width approx
  height: window.innerHeight,
  initialAgentCount: 20,
  initialResourceCount: 15,
  globalDecay: 0.1,
  scenarioDescription: "Standard Survival",
  agentConfig: {
    visionRadius: 100,
    maxSpeed: 2,
    metabolism: 0.2,
    aggressiveness: 0.3,
    social: 0.5,
    greed: 0.8,
    color: '#6366f1' // Indigo
  }
};

const App: React.FC = () => {
  const [config, setConfig] = useState<WorldConfig>(DEFAULT_CONFIG);
  const [engine, setEngine] = useState<SimulationEngine>(() => new SimulationEngine(DEFAULT_CONFIG));
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [stats, setStats] = useState({ tick: 0, agentCount: 0, avgEnergy: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentAnalysis, setAgentAnalysis] = useState<string | null>(null);

  // Animation Loop Ref
  const requestRef = useRef<number>();
  
  const updateLoop = useCallback(() => {
    if (isRunning) {
      engine.update();
      // Only update React stats every 5 ticks to save performance
      if (engine.tickCount % 5 === 0) {
          setStats(engine.getStats());
      }
    }
    requestRef.current = requestAnimationFrame(updateLoop);
  }, [isRunning, engine]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateLoop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateLoop]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        // In a real app we might want to resize the world, but here we just update width props
        // for simplicity, we won't resize the logical world dynamically to avoid coordinate bugs
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleReset = () => {
    const newEngine = new SimulationEngine(config);
    setEngine(newEngine);
    setStats(newEngine.getStats());
    setSelectedAgentId(null);
    setAgentAnalysis(null);
  };

  const handleGenerateScenario = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const generatedConfig = await generateScenarioConfig(prompt, config.width, config.height);
      
      const newConfig: WorldConfig = {
        ...config,
        ...generatedConfig,
        seed: prompt + Date.now().toString(), // New seed for new scenario
        scenarioDescription: prompt,
        agentConfig: {
            ...config.agentConfig,
            ...(generatedConfig.agentConfig || {})
        }
      };

      setConfig(newConfig);
      const newEngine = new SimulationEngine(newConfig);
      setEngine(newEngine);
      setStats(newEngine.getStats());
      setSelectedAgentId(null);
      setAgentAnalysis(null);
    } catch (e) {
      console.error("Failed to generate", e);
      alert("Failed to generate scenario. Check console/API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAgentClick = (agent: AgentData | null) => {
      setSelectedAgentId(agent ? agent.id : null);
      setAgentAnalysis(null);
  };

  // Derived selected agent object
  const selectedAgent = selectedAgentId 
    ? engine.agents.find(a => a.id === selectedAgentId) || null
    : null;

  return (
    <div className="flex w-screen h-screen bg-canvas-bg overflow-hidden">
      {/* Sidebar Control Panel */}
      <ControlPanel
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onReset={handleReset}
        onGenerateScenario={handleGenerateScenario}
        selectedAgent={selectedAgent}
        stats={stats}
        isGenerating={isGenerating}
        onAnalyzeAgent={setAgentAnalysis}
        agentAnalysis={agentAnalysis}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-canvas-bg">
        <SimulationCanvas
          engine={engine}
          width={window.innerWidth - 384} // Full width minus sidebar
          height={window.innerHeight}
          onAgentClick={handleAgentClick}
          selectedAgentId={selectedAgentId}
        />
        
        {/* Overlay Info (Scenario Name) */}
        <div className="absolute top-4 left-4 pointer-events-none">
             <h2 className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-1">Current Scenario</h2>
             <div className="text-slate-300 bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-700 inline-block">
                 {config.scenarioDescription}
             </div>
        </div>
      </div>
    </div>
  );
};

export default App;
