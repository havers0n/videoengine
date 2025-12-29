import { useRef, useEffect, useCallback, useState } from 'react';
import { EngineState, CONFIG } from '../engine/types';
import { integrate, getInitialState } from '../engine/logic';

interface GameLoopControls {
  isRunning: boolean;
  togglePause: () => void;
  reset: () => void;
  step: () => void; // Manual single-step for debugging
  state: EngineState;
  stats: {
    accumulator: number;
    fps: number;
  }
}

export const useGameLoop = (): GameLoopControls => {
  // We use Refs for the actual engine state to avoid React's async batching interfering with the loop
  const stateRef = useRef<EngineState>(getInitialState());
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const accumulatorRef = useRef<number>(0);
  
  // React state solely for rendering the UI
  const [renderState, setRenderState] = useState<EngineState>(getInitialState());
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ accumulator: 0, fps: 0 });

  // Core Loop Function
  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      
      // Cap deltaTime to prevent spiral of death if tab is backgrounded
      const safeDelta = Math.min(deltaTime, 250);
      
      accumulatorRef.current += safeDelta;

      // FIXED TIMESTEP: Consume accumulator in discrete chunks
      let updatesCount = 0;
      while (accumulatorRef.current >= CONFIG.FIXED_TIMESTEP_MS) {
        stateRef.current = integrate(stateRef.current);
        accumulatorRef.current -= CONFIG.FIXED_TIMESTEP_MS;
        updatesCount++;
      }

      // Update UI (Visuals)
      setRenderState(stateRef.current);
      setStats({
        accumulator: accumulatorRef.current, // Observable residual time
        fps: 1000 / deltaTime, // Instantaneous FPS
      });
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      previousTimeRef.current = undefined;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, animate]);

  const togglePause = () => setIsRunning(prev => !prev);

  const reset = () => {
    setIsRunning(false);
    stateRef.current = getInitialState();
    accumulatorRef.current = 0;
    previousTimeRef.current = undefined;
    setRenderState(getInitialState());
    setStats({ accumulator: 0, fps: 0 });
  };

  const step = () => {
    if (isRunning) setIsRunning(false);
    // Manually force one integration step
    stateRef.current = integrate(stateRef.current);
    setRenderState(stateRef.current);
  };

  return {
    isRunning,
    togglePause,
    reset,
    step,
    state: renderState,
    stats,
  };
};