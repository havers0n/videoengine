"use client"

import { useEffect, useRef } from "react"
import { DeterministicRNG } from "../utils/rng"
import { createInitialState, updateState } from "../engine/physics"
import { render } from "../engine/renderer"
import type { EngineState } from "../engine/types"

const FIXED_DT = 1 / 120
const SEED = 42 // Deterministic seed

interface EngineRef {
  state: EngineState
  rng: DeterministicRNG
  lastTime: number
  accumulator: number
  rafId: number | null
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<EngineRef | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Setup canvas size
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width
    canvas.height = height

    // Initialize engine state in ref
    const rng = new DeterministicRNG(SEED)
    engineRef.current = {
      state: createInitialState(width, height, rng),
      rng,
      lastTime: performance.now(),
      accumulator: 0,
      rafId: null,
    }

    // Fixed timestep accumulator loop
    const gameLoop = (currentTime: number) => {
      if (!engineRef.current) return

      const engine = engineRef.current
      const deltaTime = (currentTime - engine.lastTime) / 1000 // Convert to seconds
      engine.lastTime = currentTime

      // Add frame time to accumulator
      engine.accumulator += Math.min(deltaTime, 0.1) // Cap to prevent spiral of death

      // Update with fixed timestep
      while (engine.accumulator >= FIXED_DT) {
        engine.state = updateState(engine.state, engine.rng)
        engine.accumulator -= FIXED_DT
      }

      // Render current state
      render(ctx, engine.state)

      // Continue loop if animation is not finished
      if (engine.state.time < engine.state.animationDuration) {
        engine.rafId = requestAnimationFrame(gameLoop)
      }
    }

    // Start the loop
    engineRef.current.rafId = requestAnimationFrame(gameLoop)

    // Cleanup
    return () => {
      if (engineRef.current?.rafId) {
        cancelAnimationFrame(engineRef.current.rafId)
      }
    }
  }, [])

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          background: "#05050f",
        }}
      />
    </div>
  )
}
