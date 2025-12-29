export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Impulse {
  id: number;
  x: number;
  y: number;
  age: number;
  maxAge: number;
  radius: number;
  strength: number;
  hue: number;
}

export interface Thread {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  history: Point[];
  age: number;
  maxAge: number;
  hue: number;
  friction: number;
}

export enum EventType {
  SPAWN_IMPULSE = 'SPAWN_IMPULSE',
  RESET = 'RESET'
}

export interface GameEvent {
  type: EventType;
  payload?: any;
  timestamp: number;
}

export interface WorldState {
  impulses: Impulse[];
  threads: Thread[];
  lastTime: number;
  width: number;
  height: number;
}