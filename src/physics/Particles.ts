export interface ParticlesOptions {
  /** Velocity lost to the medium, per second, in proportion to speed: viscous. Default: 0 */
  drag?: number;
  /**
   * Speed lost per second whatever the speed: dry, like a surface. Unlike drag it brings things to
   * a stop, and holds them there while the net force per unit mass is below it. Default: 0
   */
  friction?: number;
  /** Units per second: a safety cap against a bad frame flinging things off. Default: Infinity */
  maxSpeed?: number;
}

/**
 * Point masses in 3D, stored flat (x, y, z per particle) so they can go straight to the GPU.
 * Forces accumulate between steps; `integrate` turns them into motion and clears them.
 */
export class Particles {
  readonly positions: Float32Array;
  readonly velocities: Float32Array;
  readonly forces: Float32Array;
  readonly masses: Float32Array;
  /** Held in place: forces still act on what they're connected to, never on them. */
  readonly pinned = new Set<number>();
  count = 0;
  drag: number;
  friction: number;
  maxSpeed: number;

  constructor(
    readonly capacity: number,
    options: ParticlesOptions = {},
  ) {
    this.positions = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.forces = new Float32Array(capacity * 3);
    this.masses = new Float32Array(capacity).fill(1);
    this.drag = options.drag ?? 0;
    this.friction = options.friction ?? 0;
    this.maxSpeed = options.maxSpeed ?? Infinity;
  }

  /** Returns its index, or -1 when full. */
  add(x: number, y: number, z: number, mass = 1): number {
    if (this.count >= this.capacity) return -1;
    const i = this.count++;
    this.positions.set([x, y, z], i * 3);
    this.velocities.fill(0, i * 3, i * 3 + 3);
    this.forces.fill(0, i * 3, i * 3 + 3);
    this.masses[i] = mass;
    return i;
  }

  applyForce(i: number, fx: number, fy: number, fz: number) {
    const f = this.forces;
    f[i * 3] += fx;
    f[i * 3 + 1] += fy;
    f[i * 3 + 2] += fz;
  }

  /** Semi-implicit Euler: velocity first, then position from the new velocity, which keeps springs stable. */
  integrate(delta: number) {
    const { positions: p, velocities: v, forces: f, masses } = this;
    const keep = Math.exp(-this.drag * delta);
    const slow = this.friction * delta;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      if (this.pinned.has(i)) {
        v.fill(0, o, o + 3);
        f.fill(0, o, o + 3);
        continue;
      }
      const step = delta / masses[i];
      let vx = (v[o] + f[o] * step) * keep;
      let vy = (v[o + 1] + f[o + 1] * step) * keep;
      let vz = (v[o + 2] + f[o + 2] * step) * keep;
      const speed = Math.hypot(vx, vy, vz);
      const limited = Math.min(speed - slow, this.maxSpeed);
      if (speed > 0 && limited < speed) {
        const scale = Math.max(limited, 0) / speed;
        vx *= scale;
        vy *= scale;
        vz *= scale;
      }
      v[o] = vx;
      v[o + 1] = vy;
      v[o + 2] = vz;
      p[o] += vx * delta;
      p[o + 1] += vy * delta;
      p[o + 2] += vz * delta;
      f.fill(0, o, o + 3);
    }
  }

  /** The fastest particle's speed: below a threshold, the system has settled. */
  peakSpeed(): number {
    const v = this.velocities;
    let peak = 0;
    for (let i = 0; i < this.count; i++) {
      peak = Math.max(peak, Math.hypot(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]));
    }
    return peak;
  }
}
