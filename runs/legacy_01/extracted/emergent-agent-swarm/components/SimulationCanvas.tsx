
import React, { useEffect, useRef } from 'react';
import { SimulationEngine } from '../services/SimulationEngine';
import { AgentState } from '../types';

interface SimulationCanvasProps {
  engine: SimulationEngine;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const drawAgent = (agent: any) => {
      ctx.save();
      ctx.translate(agent.position.x, agent.position.y);
      
      const angle = Math.atan2(agent.velocity.y, agent.velocity.x);
      ctx.rotate(angle);

      // Color based on state
      if (agent.state === AgentState.ALERT) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + agent.stress * 0.5})`; // text-red-500
        ctx.strokeStyle = '#fca5a5'; // text-red-300
      } else {
        ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + (1 - agent.stress) * 0.5})`; // text-blue-500
        ctx.strokeStyle = '#93c5fd'; // text-blue-300
      }

      // Draw agent body (triangle)
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Visual feedback for stress/alert
      if (agent.state === AgentState.ALERT) {
          ctx.beginPath();
          ctx.arc(0, 0, 10 + agent.stress * 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${agent.stress * 0.3})`;
          ctx.stroke();
      }

      ctx.restore();
    };

    const render = () => {
      engine.update();

      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const agent of engine.agents) {
        drawAgent(agent);
      }

      animationId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [engine]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  );
};

export default SimulationCanvas;
