import { Particles } from "./Particles";

/**
 * Particles bound into groups that also move as wholes. Each group gets a body at its centre of
 * mass; forces put on that body are shared out to its members by mass, so they accelerate together
 * and the group moves without being pulled out of shape.
 *
 * Per step: `gather`, apply forces to `bodies`, then `scatter` before integrating the particles.
 */
export class ParticleGroups {
  /** One per group, at its index: centre of mass, mean velocity, total mass. Never integrated. */
  readonly bodies: Particles;
  /** Each particle's group: any index below capacity. Particles' masses must be above 0. */
  readonly groupOf: Int32Array;
  /** The groups with members, as of the last gather. */
  readonly ids: number[] = [];

  constructor(readonly capacity: number) {
    this.bodies = new Particles(capacity);
    this.groupOf = new Int32Array(capacity).map((_, i) => i);
  }

  gather(particles: Particles) {
    const { bodies, groupOf, ids } = this;
    const n = particles.count;
    bodies.count = this.capacity;
    bodies.masses.fill(0);
    bodies.positions.fill(0);
    bodies.velocities.fill(0);
    bodies.forces.fill(0);
    ids.length = 0;
    for (let i = 0; i < n; i++) {
      const g = groupOf[i];
      const m = particles.masses[i];
      if (!bodies.masses[g]) ids.push(g);
      bodies.masses[g] += m;
      for (let axis = 0; axis < 3; axis++) {
        bodies.positions[g * 3 + axis] += particles.positions[i * 3 + axis] * m;
        bodies.velocities[g * 3 + axis] += particles.velocities[i * 3 + axis] * m;
      }
    }
    for (const g of ids) {
      for (let axis = 0; axis < 3; axis++) {
        bodies.positions[g * 3 + axis] /= bodies.masses[g];
        bodies.velocities[g * 3 + axis] /= bodies.masses[g];
      }
    }
  }

  scatter(particles: Particles) {
    const { bodies, groupOf } = this;
    for (let i = 0; i < particles.count; i++) {
      const g = groupOf[i];
      const share = particles.masses[i] / bodies.masses[g];
      const f = bodies.forces;
      particles.applyForce(i, f[g * 3] * share, f[g * 3 + 1] * share, f[g * 3 + 2] * share);
    }
  }
}
