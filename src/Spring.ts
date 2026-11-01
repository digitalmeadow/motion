export interface SpringOptions {
  /** Pull toward the target per unit of distance, above 0. Default: 100 */
  stiffness?: number;
  /** Resistance to velocity: 0 oscillates forever. Default: 10 */
  damping?: number;
  /** Default: 1 */
  mass?: number;
  /**
   * Seconds for one swing, as SwiftUI's `Spring(duration:bounce:)`: a perceptual alternative to
   * stiffness, damping and mass, which win when set.
   */
  duration?: number;
  /** With duration: 0 settles without overshoot, toward 1 springier, toward -1 slower. Default: 0 */
  bounce?: number;
  /** At rest once this close to the target... Default: 0.001 */
  restDelta?: number;
  /** ...and slower than this (units per second). Default: 0.01 */
  restSpeed?: number;
}

/**
 * A damped spring on one value, solved exactly rather than integrated: stable at any stiffness and
 * frame time, and retargetable mid-flight with its velocity kept.
 */
export class Spring {
  value: number;
  target: number;
  velocity = 0;
  stiffness: number;
  damping: number;
  mass: number;
  restDelta: number;
  restSpeed: number;

  constructor(value = 0, options: SpringOptions = {}) {
    this.value = value;
    this.target = value;
    const physical = options.stiffness ?? options.damping ?? options.mass;
    const { duration, bounce = 0 } = options;
    const timed = physical === undefined && duration !== undefined;
    const fromDuration = timed ? durationToPhysics(duration, bounce) : null;
    this.stiffness = options.stiffness ?? fromDuration?.stiffness ?? 100;
    this.damping = options.damping ?? fromDuration?.damping ?? 10;
    this.mass = options.mass ?? 1;
    this.restDelta = options.restDelta ?? 0.001;
    this.restSpeed = options.restSpeed ?? 0.01;
  }

  get atRest(): boolean {
    return (
      Math.abs(this.target - this.value) < this.restDelta &&
      Math.abs(this.velocity) < this.restSpeed
    );
  }

  /** Jumps there and stops. */
  set(value: number): this {
    this.value = this.target = value;
    this.velocity = 0;
    return this;
  }

  update(delta: number): number {
    if (this.atRest) {
      this.value = this.target;
      this.velocity = 0;
      return this.value;
    }
    const [x, v] = solve(this.value - this.target, this.velocity, this, delta);
    this.value = this.target + x;
    this.velocity = v;
    return this.value;
  }
}

/** Mass fixed at 1, as SwiftUI's. */
function durationToPhysics(duration: number, bounce: number) {
  const omega = (2 * Math.PI) / duration;
  // Past -1 the damping ratio would run to infinity.
  const ratio = bounce >= 0 ? 1 - bounce : 1 / (1 + Math.max(bounce, -0.99));
  return { stiffness: omega * omega, damping: 2 * ratio * omega };
}

/**
 * Displacement x and velocity v after t seconds of m·x'' + c·x' + k·x = 0: the closed form for
 * each of under-, critically and over-damped.
 */
function solve(
  x0: number,
  v0: number,
  { stiffness, damping, mass }: Spring,
  t: number,
): [number, number] {
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1 - 1e-6) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * t);
    const b = (v0 + zeta * omega * x0) / wd;
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    const x = decay * (x0 * cos + b * sin);
    const v = decay * (v0 * cos - (zeta * omega * b + x0 * wd) * sin);
    return [x, v];
  }

  if (zeta <= 1 + 1e-6) {
    const decay = Math.exp(-omega * t);
    const b = v0 + omega * x0;
    return [decay * (x0 + b * t), decay * (v0 - omega * b * t)];
  }

  const root = omega * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * omega + root;
  const r2 = -zeta * omega - root;
  const c2 = (v0 - r1 * x0) / (r2 - r1);
  const c1 = x0 - c2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return [c1 * e1 + c2 * e2, r1 * c1 * e1 + r2 * c2 * e2];
}
