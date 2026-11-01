/**
 * Runs a simulation in equal steps whatever the frame rate: physics stays stable and repeatable
 * at 30 Hz or 144 Hz. Time left over carries to the next frame.
 */
export class FixedTimestep {
  private accumulator = 0;

  /**
   * @param step seconds per step.
   * @param maxSteps per update: past it, time is dropped rather than caught up, so a slow frame
   * can't spiral into slower ones.
   */
  constructor(
    readonly step = 1 / 60,
    readonly maxSteps = 4,
  ) {}

  /** How far into the next step the leftover time is (0–1): for interpolating what's drawn. */
  get alpha(): number {
    return this.accumulator / this.step;
  }

  /** Returns the steps run. */
  update(delta: number, simulate: (step: number) => void): number {
    this.accumulator = Math.min(this.accumulator + delta, this.step * this.maxSteps);
    let steps = 0;
    while (this.accumulator >= this.step) {
      simulate(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    return steps;
  }

  reset() {
    this.accumulator = 0;
  }
}
