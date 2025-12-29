import { SimulationEvent } from '../types';

/**
 * A simple FIFO queue for deterministic event processing.
 * Using a ring buffer approach could be faster, but array is sufficient for this scale.
 */
export class EventBus {
  private queue: SimulationEvent[] = [];

  push(event: SimulationEvent) {
    this.queue.push(event);
  }

  consume(): SimulationEvent[] {
    if (this.queue.length === 0) return [];
    const events = [...this.queue];
    this.queue = [];
    return events;
  }

  clear() {
    this.queue = [];
  }
}
