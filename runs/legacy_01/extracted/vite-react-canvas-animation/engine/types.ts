export interface Vec2 {
  x: number
  y: number
}

export interface Particle {
  pos: Vec2
  vel: Vec2
  life: number
  maxLife: number
  size: number
  color: string
  trailPositions: Vec2[]
  trailMaxLength: number
}

export interface Thread {
  start: Vec2
  end: Vec2
  life: number
  maxLife: number
  color: string
}

export interface Hotspot {
  pos: Vec2
  radius: number
  life: number
  maxLife: number
  pulsePhase: number
  color: string
}

export interface EngineState {
  particles: Particle[]
  threads: Thread[]
  hotspots: Hotspot[]
  time: number
  animationDuration: number
  width: number
  height: number
}
