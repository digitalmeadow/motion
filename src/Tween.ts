import { toEasing, type Ease, type EasingFunction } from "./easings";
import { lerp, progress } from "./interpolation";

export interface TweenOptions {
  /** Seconds. Default: 0.3 */
  duration?: number;
  /** Default: "cubicOut" */
  ease?: Ease | EasingFunction;
}

/** One value from a start to a target over a fixed time, along an easing curve. */
export class Tween {
  value: number;
  from: number;
  target: number;
  duration: number;
  ease: EasingFunction;
  elapsed: number;

  constructor(value = 0, options: TweenOptions = {}) {
    this.value = this.from = this.target = value;
    this.duration = options.duration ?? 0.3;
    this.ease = toEasing(options.ease ?? "cubicOut");
    this.elapsed = this.duration;
  }

  get done(): boolean {
    return this.elapsed >= this.duration;
  }

  /** 0 → 1 through the run, before easing. */
  get progress(): number {
    return progress(this.elapsed, this.duration);
  }

  /** From where it is now: retargeting mid-run starts a fresh run from there. */
  start(target: number, from = this.value): this {
    this.from = from;
    this.target = target;
    this.elapsed = 0;
    this.value = from;
    return this;
  }

  /** Jumps there and stops. */
  set(value: number): this {
    this.value = this.from = this.target = value;
    this.elapsed = this.duration;
    return this;
  }

  update(delta: number): number {
    this.elapsed = Math.min(this.elapsed + delta, this.duration);
    this.value = lerp(this.from, this.target, this.ease(this.progress));
    return this.value;
  }
}
