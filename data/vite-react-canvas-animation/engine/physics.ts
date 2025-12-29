import type { DeterministicRNG } from "../utils/rng"
import type { EngineState, Particle, Thread, Hotspot, Vec2 } from "./types"

const FIXED_DT = 1 / 120

export function createInitialState(width: number, height: number, rng: DeterministicRNG): EngineState {
  const particles: Particle[] = []
  const threads: Thread[] = []
  const hotspots: Hotspot[] = []

  // Create initial particles
  for (let i = 0; i < 80; i++) {
    particles.push(createParticle(width, height, rng))
  }

  // Create initial hotspots
  for (let i = 0; i < 5; i++) {
    hotspots.push(createHotspot(width, height, rng))
  }

  return {
    particles,
    threads,
    hotspots,
    time: 0,
    animationDuration: 18,
    width,
    height,
  }
}

function createParticle(width: number, height: number, rng: DeterministicRNG): Particle {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#00ff00", "#ff6600", "#6600ff"]

  return {
    pos: {
      x: rng.range(0, width),
      y: rng.range(0, height),
    },
    vel: {
      x: rng.range(-150, 150),
      y: rng.range(-150, 150),
    },
    life: rng.range(2, 5),
    maxLife: rng.range(2, 5),
    size: rng.range(2, 6),
    color: colors[rng.int(0, colors.length)],
    trailPositions: [],
    trailMaxLength: rng.int(20, 50),
  }
}

function createThread(p1: Particle, p2: Particle, rng: DeterministicRNG): Thread {
  return {
    start: { ...p1.pos },
    end: { ...p2.pos },
    life: rng.range(0.5, 1.5),
    maxLife: rng.range(0.5, 1.5),
    color: p1.color,
  }
}

function createHotspot(width: number, height: number, rng: DeterministicRNG): Hotspot {
  const colors = ["#ff0066", "#00ffff", "#ffff00", "#00ff88", "#ff00ff"]

  return {
    pos: {
      x: rng.range(width * 0.2, width * 0.8),
      y: rng.range(height * 0.2, height * 0.8),
    },
    radius: rng.range(60, 120),
    life: rng.range(3, 6),
    maxLife: rng.range(3, 6),
    pulsePhase: rng.range(0, Math.PI * 2),
    color: colors[rng.int(0, colors.length)],
  }
}

function distance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function updateState(state: EngineState, rng: DeterministicRNG): EngineState {
  const dt = FIXED_DT
  const newState = { ...state }
  newState.time += dt

  // Stop animation after duration
  if (newState.time > newState.animationDuration) {
    return newState
  }

  // Update particles
  newState.particles = newState.particles
    .map((p) => {
      const newP = { ...p }

      // Store trail position
      newP.trailPositions = [{ ...newP.pos }, ...p.trailPositions.slice(0, p.trailMaxLength - 1)]

      // Update position
      newP.pos = {
        x: p.pos.x + p.vel.x * dt,
        y: p.pos.y + p.vel.y * dt,
      }

      // Bounce off walls
      if (newP.pos.x < 0 || newP.pos.x > state.width) {
        newP.vel.x *= -0.95
        newP.pos.x = Math.max(0, Math.min(state.width, newP.pos.x))
      }
      if (newP.pos.y < 0 || newP.pos.y > state.height) {
        newP.vel.y *= -0.95
        newP.pos.y = Math.max(0, Math.min(state.height, newP.pos.y))
      }

      // Apply gravity and friction
      newP.vel.y += 50 * dt
      newP.vel.x *= 0.998
      newP.vel.y *= 0.998

      // Decrease life
      newP.life -= dt

      return newP
    })
    .filter((p) => p.life > 0)

  // Spawn new particles
  if (newState.time < newState.animationDuration - 2) {
    while (newState.particles.length < 80) {
      newState.particles.push(createParticle(state.width, state.height, rng))
    }
  }

  // Create threads between nearby particles
  const newThreads: Thread[] = []
  for (let i = 0; i < newState.particles.length; i++) {
    for (let j = i + 1; j < newState.particles.length; j++) {
      const p1 = newState.particles[i]
      const p2 = newState.particles[j]
      const dist = distance(p1.pos, p2.pos)

      if (dist < 120 && rng.next() < 0.05) {
        newThreads.push(createThread(p1, p2, rng))
      }
    }
  }

  // Update existing threads
  newState.threads = [...state.threads, ...newThreads]
    .map((t) => ({
      ...t,
      life: t.life - dt,
    }))
    .filter((t) => t.life > 0)
    .slice(-50) // Keep only last 50 threads

  // Update hotspots
  newState.hotspots = newState.hotspots
    .map((h) => ({
      ...h,
      life: h.life - dt,
      pulsePhase: h.pulsePhase + dt * 3,
    }))
    .filter((h) => h.life > 0)

  // Spawn new hotspots
  if (newState.hotspots.length < 5 && newState.time < newState.animationDuration - 3 && rng.next() < 0.02) {
    newState.hotspots.push(createHotspot(state.width, state.height, rng))
  }

  return newState
}
