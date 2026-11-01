import type { Particles } from "./Particles";

/** Closer than this, forces treat particles as this far apart: no infinities on overlap. */
const MIN_DISTANCE = 0.01;

export interface SpringForce {
  stiffness: number;
  /** Rest length. Default: 0 */
  length?: number;
  /** Resists the ends' relative speed along the spring: stops it ringing. Default: 0 */
  damping?: number;
}

/** A damped Hooke spring between two particles: pulls when stretched, pushes when squashed. */
export function spring(p: Particles, a: number, b: number, force: SpringForce) {
  const { stiffness, length = 0, damping = 0 } = force;
  const x = p.positions;
  const v = p.velocities;
  const dx = x[b * 3] - x[a * 3];
  const dy = x[b * 3 + 1] - x[a * 3 + 1];
  const dz = x[b * 3 + 2] - x[a * 3 + 2];
  const distance = Math.max(Math.hypot(dx, dy, dz), MIN_DISTANCE);
  const nx = dx / distance;
  const ny = dy / distance;
  const nz = dz / distance;
  const closing =
    (v[b * 3] - v[a * 3]) * nx +
    (v[b * 3 + 1] - v[a * 3 + 1]) * ny +
    (v[b * 3 + 2] - v[a * 3 + 2]) * nz;
  const f = stiffness * (distance - length) + damping * closing;
  p.applyForce(a, nx * f, ny * f, nz * f);
  p.applyForce(b, -nx * f, -ny * f, -nz * f);
}

/** Pulls a particle toward a point, harder the further it is: a spring to a fixed anchor. */
export function attract(
  p: Particles,
  i: number,
  x: number,
  y: number,
  z: number,
  stiffness: number,
) {
  const o = i * 3;
  const at = p.positions;
  p.applyForce(
    i,
    (x - at[o]) * stiffness,
    (y - at[o + 1]) * stiffness,
    (z - at[o + 2]) * stiffness,
  );
}

/**
 * Resists a particle's velocity relative to a reference, by coefficient per unit of speed: still
 * air by default, or a moving frame (a group's mean velocity) for friction within it.
 */
export function drag(p: Particles, i: number, coefficient: number, vx = 0, vy = 0, vz = 0) {
  const o = i * 3;
  const v = p.velocities;
  p.applyForce(
    i,
    (vx - v[o]) * coefficient,
    (vy - v[o + 1]) * coefficient,
    (vz - v[o + 2]) * coefficient,
  );
}

/**
 * Pushes two particles apart, inverse-square like charge, fading smoothly to nothing at radius: a
 * hard cut there makes particles twitch as they cross it.
 */
export function repel(p: Particles, a: number, b: number, strength: number, radius: number) {
  const x = p.positions;
  const dx = x[a * 3] - x[b * 3];
  const dy = x[a * 3 + 1] - x[b * 3 + 1];
  const dz = x[a * 3 + 2] - x[b * 3 + 2];
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 >= radius * radius) return;
  const fade = (1 - d2 / (radius * radius)) ** 2;
  const distance = Math.max(Math.sqrt(d2), MIN_DISTANCE);
  const f = (strength * fade) / (distance * distance * distance);
  p.applyForce(a, dx * f, dy * f, dz * f);
  p.applyForce(b, -dx * f, -dy * f, -dz * f);
}
