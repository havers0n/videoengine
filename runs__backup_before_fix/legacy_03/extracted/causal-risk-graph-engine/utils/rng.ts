export class SeededRNG {
  private m = 0x80000000;
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: number) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextInt(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }

  nextFloat(): number {
    // Returns 0.0 to 1.0
    return this.nextInt() / (this.m - 1);
  }

  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }
}