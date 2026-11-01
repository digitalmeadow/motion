/**
 * The share of the remaining distance to cover this frame, so smoothing reads the same at any frame
 * rate (a plain `lerp(a, b, 0.1)` per frame runs twice as fast at 120 Hz). Rate is per second:
 * after 1 / rate seconds about 63% of the distance is covered.
 */
export function dampFactor(rate: number, delta: number): number {
  return 1 - Math.exp(-rate * delta);
}

/** Exponential smoothing toward a target: fast at first, easing in. No overshoot, no velocity. */
export function damp(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * dampFactor(rate, delta);
}

/** The rate that halves the remaining distance every halfLife seconds. */
export function halfLifeRate(halfLife: number): number {
  return Math.LN2 / halfLife;
}
