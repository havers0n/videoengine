import React, { useState } from 'react';
import { AgentData, WorldConfig } from '../types';
import { Play, Pause, RefreshCw, Wand2, BrainCircuit, Activity, Database, Users } from 'lucide-react';
import { analyzeAgentBehavior } from '../services/geminiService';

interface ControlPanelProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onGenerateScenario: (prompt: string) => void;
  selectedAgent: AgentData | null;
  stats: { tick: number; agentCount: number; avgEnergy: number };
  isGenerating: boolean;
  onAnalyzeAgent: (analysis: string) => void;
  agentAnalysis: string | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  onTogglePlay,
  onReset,
  onGenerateScenario,
  selectedAgent,
  stats,
  isGenerating,
  onAnalyzeAgent,
  agentAnalysis
}) => {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerateScenario(prompt);
  };

  const handleAnalyzeClick = async () => {
    if (!selectedAgent) return;
    setIsAnalyzing(true);
    // Passing 0,0 as placeholders for now, in a real app these would come from the engine query
    const result = await analyzeAgentBehavior(selectedAgent, 3, 2); 
    onAnalyzeAgent(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="w-96 h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 text-slate-100 overflow-y-auto z-10 shadow-xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          NeuroCanvas
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">DETERMINISTIC AGENT SYSTEM</p>
      </div>

      {/* Global Controls */}
      <div className="flex gap-2">
        <button
          onClick={onTogglePlay}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-all ${
            isRunning 
              ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/50' 
              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/50'
          }`}
        >
          {isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Run</>}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          title="Reset Simulation"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex flex-col items-center">
            <Activity size={14} className="text-slate-400 mb-1"/>
            <span className="text-xs text-slate-400">TICK</span>
            <span className="font-mono text-sm">{stats.tick}</span>
        </div>
        <div className="flex flex-col items-center">
            <Users size={14} className="text-slate-400 mb-1"/>
            <span className="text-xs text-slate-400">AGENTS</span>
            <span className="font-mono text-sm">{stats.agentCount}</span>
        </div>
        <div className="flex flex-col items-center">
            <Database size={14} className="text-slate-400 mb-1"/>
            <span className="text-xs text-slate-400">ENERGY</span>
            <span className="font-mono text-sm">{stats.avgEnergy.toFixed(0)}</span>
        </div>
      </div>

      {/* Gemini Scenario Generator */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Wand2 size={16} className="text-purple-400"/>
          AI Scenario Generator
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'A high-speed world where aggressive red agents hunt peaceful blue gatherers...'"
          className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-3 text-sm focus:ring-1 focus:ring-purple-500 outline-none resize-none placeholder-slate-600"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? 'Generating Config...' : 'Generate World'}
        </button>
      </div>

      {/* Agent Inspector */}
      <div className="flex-1 min-h-0 flex flex-col pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
          <BrainCircuit size={16} className="text-cyan-400"/>
          Agent Inspector
        </div>
        
        {selectedAgent ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* ID & Basic Info */}
            <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-slate-400">{selectedAgent.id.split('-').slice(1).join('-')}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide
                        ${selectedAgent.state === 'IDLE' ? 'bg-slate-700 text-slate-300' : 
                          selectedAgent.state === 'GATHERING' ? 'bg-green-900 text-green-300' :
                          selectedAgent.state === 'FLEEING' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}
                    `}>
                        {selectedAgent.state}
                    </span>
                </div>
                
                {/* Personality DNA */}
                <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Aggression</span>
                        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{width: `${selectedAgent.config.aggressiveness * 100}%`}}></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Social</span>
                        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{width: `${selectedAgent.config.social * 100}%`}}></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Greed</span>
                        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{width: `${selectedAgent.config.greed * 100}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Analysis */}
            <div className="p-3 bg-slate-800/30 rounded border border-slate-700/50">
               <div className="flex justify-between items-center mb-2">
                   <h3 className="text-xs font-bold text-slate-300 uppercase">Neural Analysis</h3>
                   <button 
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="text-[10px] bg-cyan-900/50 hover:bg-cyan-900 text-cyan-300 px-2 py-1 rounded border border-cyan-800 transition-colors"
                   >
                       {isAnalyzing ? '...' : 'Analyze'}
                   </button>
               </div>
               <p className="text-sm text-slate-400 italic leading-relaxed min-h-[60px]">
                   {agentAnalysis || "Select 'Analyze' to read this agent's thoughts..."}
               </p>
            </div>

            {/* Memory Log */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Recent Memory</h3>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {selectedAgent.memory.length === 0 && <span className="text-xs text-slate-600">No memories yet.</span>}
                    {selectedAgent.memory.slice().reverse().map((mem, idx) => (
                        <div key={idx} className="text-xs p-2 bg-slate-900 rounded border border-slate-800/50 flex justify-between">
                            <span className="text-slate-300">{mem.event}</span>
                            <span className="text-slate-600 font-mono">T:{mem.tick}</span>
                        </div>
                    ))}
                </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
             <BrainCircuit size={48} strokeWidth={1} />
             <p className="text-sm">Select an agent to inspect</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ControlPanel;
