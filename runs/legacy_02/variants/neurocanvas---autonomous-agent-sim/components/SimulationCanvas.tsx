import React, { useRef, useEffect } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { AgentData, AgentState } from '../types';

interface SimulationCanvasProps {
  engine: SimulationEngine;
  onAgentClick: (agent: AgentData | null) => void;
  width: number;
  height: number;
  selectedAgentId: string | null;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ engine, onAgentClick, width, height, selectedAgentId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear background
      ctx.fillStyle = '#0f172a'; // Match Tailwind slate-900
      ctx.fillRect(0, 0, width, height);

      // Draw Grid (Subtle)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Resources
      engine.resources.forEach(res => {
        ctx.fillStyle = res.color;
        ctx.beginPath();
        // Diamond shape
        ctx.moveTo(res.position.x, res.position.y - 4);
        ctx.lineTo(res.position.x + 4, res.position.y);
        ctx.lineTo(res.position.x, res.position.y + 4);
        ctx.lineTo(res.position.x - 4, res.position.y);
        ctx.fill();
        
        // Glow
        ctx.shadowBlur = 5;
        ctx.shadowColor = res.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Agents
      engine.agents.forEach(agent => {
        const isSelected = agent.id === selectedAgentId;

        // Draw Vision Radius (if selected)
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(agent.position.x, agent.position.y, agent.config.visionRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.stroke();
        }

        // Draw Body
        ctx.fillStyle = agent.config.color;
        ctx.beginPath();
        ctx.arc(agent.position.x, agent.position.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw Selection Ring
        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw Energy Bar (Tiny)
        const barWidth = 12;
        const healthPct = agent.energy / agent.maxEnergy;
        ctx.fillStyle = '#334155';
        ctx.fillRect(agent.position.x - 6, agent.position.y - 10, barWidth, 3);
        ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(agent.position.x - 6, agent.position.y - 10, barWidth * healthPct, 3);

        // Draw Target Line
        if (agent.target && isSelected) {
            ctx.beginPath();
            ctx.moveTo(agent.position.x, agent.position.y);
            ctx.lineTo(agent.target.x, agent.target.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [engine, width, height, selectedAgentId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked agent
    const clickedAgent = engine.agents.find(a => {
      const dx = a.position.x - x;
      const dy = a.position.y - y;
      return Math.sqrt(dx*dx + dy*dy) < 15; // Click radius
    });

    onAgentClick(clickedAgent || null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="cursor-crosshair shadow-2xl border border-slate-700 rounded-lg bg-slate-900"
    />
  );
};

export default SimulationCanvas;
