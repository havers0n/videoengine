import type { EngineState } from "./types"

export function render(ctx: CanvasRenderingContext2D, state: EngineState): void {
  const { width, height } = state

  // Clear canvas with fade effect
  ctx.fillStyle = "rgba(5, 5, 15, 0.25)"
  ctx.fillRect(0, 0, width, height)

  // Render hotspots with radial gradients and glow
  for (const hotspot of state.hotspots) {
    const alpha = hotspot.life / hotspot.maxLife
    const pulse = Math.sin(hotspot.pulsePhase) * 0.3 + 0.7
    const radius = hotspot.radius * pulse

    ctx.save()

    // Glow effect
    ctx.shadowBlur = 40
    ctx.shadowColor = hotspot.color

    // Create radial gradient
    const gradient = ctx.createRadialGradient(hotspot.pos.x, hotspot.pos.y, 0, hotspot.pos.x, hotspot.pos.y, radius)

    const color = hexToRgb(hotspot.color)
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`)
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.2})`)
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(hotspot.pos.x, hotspot.pos.y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // Render threads (lines between particles)
  ctx.save()
  ctx.shadowBlur = 8

  for (const thread of state.threads) {
    const alpha = thread.life / thread.maxLife
    const color = hexToRgb(thread.color)

    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.4})`
    ctx.shadowColor = thread.color
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(thread.start.x, thread.start.y)
    ctx.lineTo(thread.end.x, thread.end.y)
    ctx.stroke()
  }

  ctx.restore()

  // Render particle trails with alpha fade
  for (const particle of state.particles) {
    if (particle.trailPositions.length < 2) continue

    ctx.save()
    ctx.shadowBlur = 5
    ctx.shadowColor = particle.color

    for (let i = 0; i < particle.trailPositions.length - 1; i++) {
      const p1 = particle.trailPositions[i]
      const p2 = particle.trailPositions[i + 1]
      const alpha = (1 - i / particle.trailPositions.length) * 0.6
      const color = hexToRgb(particle.color)

      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
      ctx.lineWidth = particle.size * 0.5

      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    ctx.restore()
  }

  // Render particles with glow
  ctx.save()
  ctx.shadowBlur = 15

  for (const particle of state.particles) {
    const alpha = Math.min(1, particle.life / particle.maxLife)
    const color = hexToRgb(particle.color)

    ctx.shadowColor = particle.color
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`

    ctx.beginPath()
    ctx.arc(particle.pos.x, particle.pos.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // Render time indicator
  const progress = Math.min(1, state.time / state.animationDuration)
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
  ctx.font = "14px monospace"
  ctx.fillText(`Time: ${state.time.toFixed(2)}s / ${state.animationDuration}s`, 10, 20)

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
  ctx.fillRect(10, 30, 200, 4)
  ctx.fillStyle = "rgba(0, 255, 255, 0.8)"
  ctx.fillRect(10, 30, 200 * progress, 4)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}
