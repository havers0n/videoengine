/**
 * Simple Linear Congruential Generator for seeded randomness.
 * Ensures the simulation starts in the same state every reload.
 */
class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a float between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Returns a float between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// Export a singleton or a factory if needed, here we just export the class
export default RNG;