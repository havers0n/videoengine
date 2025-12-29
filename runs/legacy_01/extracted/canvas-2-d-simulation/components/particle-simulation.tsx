"use client"

import { useRef, useEffect } from "react"

// Seeded RNG (Mulberry32)
class SeededRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  cluster: number
  trail: { x: number; y: number; alpha: number }[]
  energy: number
}

interface Cluster {
  id: number
  centerX: number
  centerY: number
  color: string
  glowColor: string
}

interface SpatialGrid {
  cellSize: number
  cols: number
  rows: number
  cells: Map<string, Particle[]>
}

export default function ParticleSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    particles: [] as Particle[],
    clusters: [] as Cluster[],
    grid: null as SpatialGrid | null,
    width: 0,
    height: 0,
    rng: new SeededRNG(42069),
    accumulator: 0,
    lastTime: 0,
    hotspots: [] as { x: number; y: number; intensity: number; decay: number }[],
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    // Constants
    const FIXED_TIMESTEP = 1 / 120
    const MAX_TRAIL_LENGTH = 15
    const PARTICLE_COUNT = 250
    const CLUSTER_COUNT = 8
    const CELL_SIZE = 80
    const CONNECTION_DISTANCE = 100
    const ATTRACTION_STRENGTH = 0.15
    const REPULSION_STRENGTH = 0.08
    const DAMPING = 0.98

    // Resize handler
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)

      stateRef.current.width = window.innerWidth
      stateRef.current.height = window.innerHeight

      initializeSimulation()
    }

    // Initialize clusters
    const initializeClusters = () => {
      const { rng, width, height } = stateRef.current
      const colors = [
        { main: "rgba(99, 102, 241, 1)", glow: "rgba(99, 102, 241, 0.6)" }, // Indigo
        { main: "rgba(236, 72, 153, 1)", glow: "rgba(236, 72, 153, 0.6)" }, // Pink
        { main: "rgba(34, 211, 238, 1)", glow: "rgba(34, 211, 238, 0.6)" }, // Cyan
        { main: "rgba(251, 146, 60, 1)", glow: "rgba(251, 146, 60, 0.6)" }, // Orange
        { main: "rgba(168, 85, 247, 1)", glow: "rgba(168, 85, 247, 0.6)" }, // Purple
        { main: "rgba(52, 211, 153, 1)", glow: "rgba(52, 211, 153, 0.6)" }, // Emerald
        { main: "rgba(248, 113, 113, 1)", glow: "rgba(248, 113, 113, 0.6)" }, // Red
        { main: "rgba(250, 204, 21, 1)", glow: "rgba(250, 204, 21, 0.6)" }, // Yellow
      ]

      stateRef.current.clusters = Array.from({ length: CLUSTER_COUNT }, (_, i) => ({
        id: i,
        centerX: rng.range(width * 0.2, width * 0.8),
        centerY: rng.range(height * 0.2, height * 0.8),
        color: colors[i % colors.length].main,
        glowColor: colors[i % colors.length].glow,
      }))
    }

    // Initialize particles
    const initializeParticles = () => {
      const { rng, width, height, clusters } = stateRef.current

      stateRef.current.particles = Array.from({ length: PARTICLE_COUNT }, () => {
        const cluster = clusters[Math.floor(rng.next() * clusters.length)]
        const angle = rng.range(0, Math.PI * 2)
        const radius = rng.range(20, 80)

        return {
          x: cluster.centerX + Math.cos(angle) * radius,
          y: cluster.centerY + Math.sin(angle) * radius,
          vx: rng.range(-0.5, 0.5),
          vy: rng.range(-0.5, 0.5),
          cluster: cluster.id,
          trail: [],
          energy: rng.range(0.5, 1),
        }
      })
    }

    // Create spatial grid
    const createSpatialGrid = (): SpatialGrid => {
      const { width, height } = stateRef.current
      return {
        cellSize: CELL_SIZE,
        cols: Math.ceil(width / CELL_SIZE),
        rows: Math.ceil(height / CELL_SIZE),
        cells: new Map(),
      }
    }

    // Insert particle into grid
    const insertIntoGrid = (grid: SpatialGrid, particle: Particle) => {
      const col = Math.floor(particle.x / grid.cellSize)
      const row = Math.floor(particle.y / grid.cellSize)
      const key = `${col},${row}`

      if (!grid.cells.has(key)) {
        grid.cells.set(key, [])
      }
      grid.cells.get(key)!.push(particle)
    }

    // Get nearby particles from grid
    const getNearbyParticles = (grid: SpatialGrid, particle: Particle): Particle[] => {
      const col = Math.floor(particle.x / grid.cellSize)
      const row = Math.floor(particle.y / grid.cellSize)
      const nearby: Particle[] = []

      // Check 3x3 grid around particle
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const key = `${col + dx},${row + dy}`
          const cellParticles = grid.cells.get(key)
          if (cellParticles) {
            nearby.push(...cellParticles)
          }
        }
      }

      return nearby
    }

    // Initialize simulation
    const initializeSimulation = () => {
      initializeClusters()
      initializeParticles()
      stateRef.current.grid = createSpatialGrid()
    }

    // Physics update (fixed timestep)
    const updatePhysics = () => {
      const { particles, clusters, width, height, hotspots, rng } = stateRef.current
      const grid = createSpatialGrid()

      // Clear grid and populate
      particles.forEach((p) => insertIntoGrid(grid, p))
      stateRef.current.grid = grid

      // Update particles
      particles.forEach((particle) => {
        const cluster = clusters[particle.cluster]
        const nearby = getNearbyParticles(grid, particle)

        let fx = 0
        let fy = 0

        // Attraction to cluster center
        const dcx = cluster.centerX - particle.x
        const dcy = cluster.centerY - particle.y
        const distToCenter = Math.sqrt(dcx * dcx + dcy * dcy)

        if (distToCenter > 50) {
          fx += (dcx / distToCenter) * ATTRACTION_STRENGTH * particle.energy
          fy += (dcy / distToCenter) * ATTRACTION_STRENGTH * particle.energy
        }

        // Interact with nearby particles
        nearby.forEach((other) => {
          if (other === particle) return

          const dx = other.x - particle.x
          const dy = other.y - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 5) return // Avoid division by zero

          if (other.cluster === particle.cluster) {
            // Same cluster: weak attraction
            if (dist < CONNECTION_DISTANCE && dist > 30) {
              fx += (dx / dist) * 0.02
              fy += (dy / dist) * 0.02
            }
          } else {
            // Different cluster: repulsion
            if (dist < 60) {
              fx -= (dx / dist) * REPULSION_STRENGTH
              fy -= (dy / dist) * REPULSION_STRENGTH
            }
          }
        })

        // Apply forces
        particle.vx += fx
        particle.vy += fy

        // Damping
        particle.vx *= DAMPING
        particle.vy *= DAMPING

        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Boundary wrapping
        if (particle.x < 0) particle.x = width
        if (particle.x > width) particle.x = 0
        if (particle.y < 0) particle.y = height
        if (particle.y > height) particle.y = 0

        // Trail update
        particle.trail.unshift({ x: particle.x, y: particle.y, alpha: 1 })
        if (particle.trail.length > MAX_TRAIL_LENGTH) {
          particle.trail.pop()
        }

        // Update trail alpha
        particle.trail.forEach((t, i) => {
          t.alpha = 1 - i / MAX_TRAIL_LENGTH
        })

        // Random hotspot generation
        if (rng.next() < 0.002) {
          hotspots.push({
            x: particle.x,
            y: particle.y,
            intensity: 1,
            decay: 0.02,
          })
        }
      })

      // Update hotspots
      stateRef.current.hotspots = hotspots.filter((h) => {
        h.intensity -= h.decay
        return h.intensity > 0
      })
    }

    // Render
    const render = () => {
      const { particles, clusters, hotspots, width, height, grid } = stateRef.current

      // Clear with fade effect
      ctx.fillStyle = "rgba(10, 10, 20, 0.15)"
      ctx.fillRect(0, 0, width, height)

      // Draw hotspots
      hotspots.forEach((hotspot) => {
        const gradient = ctx.createRadialGradient(hotspot.x, hotspot.y, 0, hotspot.x, hotspot.y, 60)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${hotspot.intensity * 0.3})`)
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(hotspot.x, hotspot.y, 60, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw connections (optimized with spatial grid)
      ctx.lineWidth = 1
      particles.forEach((particle) => {
        if (!grid) return
        const nearby = getNearbyParticles(grid, particle)
        const cluster = clusters[particle.cluster]

        nearby.forEach((other) => {
          if (other === particle || other.cluster !== particle.cluster) return

          const dx = other.x - particle.x
          const dy = other.y - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.3
            ctx.strokeStyle = cluster.color.replace("1)", `${alpha})`)
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        })
      })

      // Draw trails
      particles.forEach((particle) => {
        const cluster = clusters[particle.cluster]

        for (let i = 1; i < particle.trail.length; i++) {
          const t1 = particle.trail[i - 1]
          const t2 = particle.trail[i]

          ctx.strokeStyle = cluster.color.replace("1)", `${t2.alpha * 0.2})`)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(t1.x, t1.y)
          ctx.lineTo(t2.x, t2.y)
          ctx.stroke()
        }
      })

      // Draw particles
      particles.forEach((particle) => {
        const cluster = clusters[particle.cluster]

        // Glow effect
        ctx.shadowBlur = 20
        ctx.shadowColor = cluster.glowColor

        ctx.fillStyle = cluster.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 3 + particle.energy * 1.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
      })
    }

    // Game loop with fixed timestep
    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - stateRef.current.lastTime) / 1000
      stateRef.current.lastTime = currentTime
      stateRef.current.accumulator += deltaTime

      // Fixed timestep updates
      while (stateRef.current.accumulator >= FIXED_TIMESTEP) {
        updatePhysics()
        stateRef.current.accumulator -= FIXED_TIMESTEP
      }

      render()
      requestAnimationFrame(gameLoop)
    }

    // Start
    resize()
    window.addEventListener("resize", resize)
    stateRef.current.lastTime = performance.now()
    requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="h-full w-full" />
}
