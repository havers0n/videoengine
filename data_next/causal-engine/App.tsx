import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Engine } from './services/Engine';
import { SimulationConfig, PlayState } from './types';
import { Controls } from './components/Controls';
import { InfoPanel } from './components/InfoPanel';
import { Vec2 } from './services/mathUtils';

// Default Configuration
const DEFAULT_CONFIG: SimulationConfig = {
  seed: 1337,
  entityCount: 100,
  informationSpeed: 5, // Pixels per tick. 5 is very slow ("relativistic"), 100 is instant-ish.
  separationWeight: 2.0,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,
  maxSpeed: 3,
  maxForce: 0.05,
  perceptionRadius: 60,
  historyLength: 400, // Keep ~6-7 seconds of history at 60hz
};

const TARGET_FPS = 60;
const TIMESTEP = 1000 / TARGET_FPS;

const App: React.FC = () => {
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Engine Refs (Mutable, non-reactive state for loop)
  const engineRef = useRef<Engine>(new Engine(DEFAULT_CONFIG));
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  // React State for UI
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [playState, setPlayState] = useState<PlayState>(PlayState.PAUSED);
  const [metrics, setMetrics] = useState({ tick: 0, fps: 0 });

  // Initialize engine on first load or reset
  const resetEngine = useCallback(() => {
    engineRef.current.updateConfig(config);
    engineRef.current.reset();
    setMetrics(prev => ({ ...prev, tick: 0 }));
    // Force a render of the initial state
    if (canvasRef.current && containerRef.current) {
        draw(canvasRef.current.getContext('2d')!, containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  }, [config]);

  // Handle Config Changes
  const handleConfigChange = (newConfig: Partial<SimulationConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    
    // Some config changes require immediate engine update (e.g. weights), others might need reset (count)
    if (newConfig.entityCount !== undefined || newConfig.seed !== undefined) {
       // Defer reset to avoid jank, or do it immediately. 
       // For deterministic integrity, changing seed/count usually implies a reset in this context.
       // We'll update the config in the engine, but let the user hit RESET to apply structural changes fully if desired,
       // OR we can auto-reset. Let's auto-reset for seed/count to maintain causality consistency.
       engineRef.current.config = merged;
       engineRef.current.reset();
    } else {
       engineRef.current.updateConfig(merged);
    }
  };

  // Drawing Logic
  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    const engine = engineRef.current;
    
    // Draw Grid (Subtle)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y < height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    // Visualizing Causality: Selected Entity Logic
    // Just visualize the first entity's "perception" to keep it clean, or mouse hover (todo).
    // Let's visualize the "Past" positions of neighbors relative to Entity 0
    
    const observer = engine.entities[0];
    if (observer) {
      // Draw Observer
      ctx.beginPath();
      ctx.arc(observer.position.x, observer.position.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b'; // Amber-500
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.fill();

      // Draw Perception Radius
      ctx.beginPath();
      ctx.arc(observer.position.x, observer.position.y, config.perceptionRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Light Cones / Connections
      engine.entities.forEach((other, idx) => {
        if (idx === 0) return;
        
        const dist = Vec2.dist(observer.position, other.position);
        if (dist < config.perceptionRadius * 2) { // Only draw if somewhat close to avoid clutter
            const delayTicks = Math.ceil(dist / config.informationSpeed);
            const perceivedTick = engine.tickCount - delayTicks;
            
            // Find where this entity WAS
            // We need to access the engine's history which is private, let's cast or accessor
            // Ideally add public accessor in Engine class. For now accessing via the loop variable we know exists.
            
            // NOTE: Ideally we'd use a public method. Since we are in the drawing loop and have the instance:
            // Let's iterate history manually or add a helper.
            // For performance, we'll do a quick scan if history is available.
            
            let pastPos = other.position;
            const history = engine.history;
            const oldestTick = history[0]?.tick || 0;
            const historyIndex = perceivedTick - oldestTick;
            
            if (historyIndex >= 0 && historyIndex < history.length) {
                const pastEntity = history[historyIndex].entities.find(e => e.id === other.id);
                if (pastEntity) pastPos = pastEntity.position;
            }

            // Draw line from Observer to WHERE IT SEES the neighbor
            // Color based on delay (red = old news, green = fresh)
            const alpha = Math.max(0.1, 1 - (dist / 300));
            ctx.beginPath();
            ctx.moveTo(observer.position.x, observer.position.y);
            ctx.lineTo(pastPos.x, pastPos.y);
            
            // Gradient for the time link
            const grad = ctx.createLinearGradient(observer.position.x, observer.position.y, pastPos.x, pastPos.y);
            grad.addColorStop(0, '#f59e0b');
            grad.addColorStop(1, '#10b981'); // Emerald
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Draw "Ghost" at past position
            ctx.beginPath();
            ctx.arc(pastPos.x, pastPos.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();
        }
      });
    }

    // Draw All Entities
    engine.entities.forEach(entity => {
      ctx.beginPath();
      ctx.arc(entity.position.x, entity.position.y, entity.radius, 0, Math.PI * 2);
      
      // Color by velocity or ID
      if (entity.id === 0) {
         ctx.fillStyle = '#f59e0b';
      } else {
         ctx.fillStyle = entity.color;
      }
      ctx.fill();
    });
  };

  // Main Loop
  const tick = (time: number) => {
    if (playState !== PlayState.PLAYING && playState !== PlayState.REWINDING) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(tick);
        return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Cap delta time to prevent spiral of death if tab inactive
    const safeDelta = Math.min(deltaTime, 100); 
    accumulatorRef.current += safeDelta;

    // Fixed Timestep Update
    while (accumulatorRef.current >= TIMESTEP) {
        engineRef.current.tick(
            containerRef.current?.clientWidth || 800,
            containerRef.current?.clientHeight || 600
        );
        accumulatorRef.current -= TIMESTEP;
    }

    // Update Metrics
    setMetrics({
        tick: engineRef.current.tickCount,
        fps: 1000 / deltaTime
    });

    // Render
    if (canvasRef.current && containerRef.current) {
        draw(canvasRef.current.getContext('2d')!, containerRef.current.clientWidth, containerRef.current.clientHeight);
    }

    requestRef.current = requestAnimationFrame(tick);
  };

  // Setup / Teardown Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [playState]); // Re-bind when playstate changes to ensure logic flow

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
            // Redraw immediately
             draw(canvasRef.current.getContext('2d')!, containerRef.current.clientWidth, containerRef.current.clientHeight);
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manual Step
  const handleStep = () => {
     if (containerRef.current) {
         engineRef.current.tick(containerRef.current.clientWidth, containerRef.current.clientHeight);
         setMetrics({ tick: engineRef.current.tickCount, fps: 0 });
         if (canvasRef.current) {
            draw(canvasRef.current.getContext('2d')!, containerRef.current.clientWidth, containerRef.current.clientHeight);
         }
     }
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
      
      {/* Simulation Container */}
      <div ref={containerRef} className="absolute inset-0 z-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      <InfoPanel 
        tick={metrics.tick} 
        fps={metrics.fps} 
        entityCount={config.entityCount}
        delayedTicks={config.informationSpeed}
      />

      <Controls 
        config={config} 
        playState={playState}
        onConfigChange={handleConfigChange}
        onTogglePlay={() => setPlayState(s => s === PlayState.PLAYING ? PlayState.PAUSED : PlayState.PLAYING)}
        onReset={resetEngine}
        onStep={handleStep}
      />

    </div>
  );
};

export default App;
