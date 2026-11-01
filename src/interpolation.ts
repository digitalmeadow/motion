export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Where value sits between a and b: 0 at a, 1 at b, unclamped. */
export function inverseLerp(a: number, b: number, value: number): number {
  return a === b ? 0 : (value - a) / (b - a);
}

export function mapRange(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number {
  return lerp(toMin, toMax, inverseLerp(fromMin, fromMax, value));
}

/** How far through a timed motion: elapsed over duration, clamped to 0–1. */
export function progress(elapsed: number, duration: number): number {
  return duration > 0 ? clamp(elapsed / duration, 0, 1) : 1;
}
