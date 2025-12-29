// A simple seeded Linear Congruential Generator (LCG) for deterministic results
// Not cryptographically secure, but sufficient for simulation stability.

class DeterministicRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  // Returns a float between 0 and 1
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  // Returns integer between min and max (inclusive of min, exclusive of max)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min) + min);
  }
}

export const rng = new DeterministicRandom(42);
