import type { Particles } from "./Particles";

/** Deeper than this, particles share a leaf: coincident ones would otherwise split cells forever. */
const MAX_DEPTH = 20;
const MIN_DISTANCE = 0.01;
const EMPTY = -1;
const INTERNAL = -2;

/**
 * Inverse-square repulsion between every pair of particles in O(n log n), not O(n²): an octree
 * sums each cell's mass, and a cell small enough for its distance pushes as one body.
 * Preallocated, so building and pushing make no garbage frame to frame.
 */
export class BarnesHut {
  /** A cell narrower than this fraction of its distance counts as one body: lower is more exact. */
  theta: number;

  private cellCapacity = 0;
  private cells = 0;
  /** Per cell: centre x, y, z and half-width. */
  private bounds = new Float64Array(0);
  /** Per cell: centre of mass x, y, z and mass. */
  private sums = new Float64Array(0);
  private children = new Int32Array(0);
  /** Per cell: EMPTY, INTERNAL, or the first particle of its leaf. */
  private body = new Int32Array(0);
  /** Per particle: the next sharing its leaf, or EMPTY. */
  private next: Int32Array;
  private stack = new Int32Array(MAX_DEPTH * 8 + 8);
  private particles: Particles | null = null;
  private indices: ArrayLike<number> = [];
  private all: Int32Array;

  constructor(capacity: number, theta = 0.9) {
    this.theta = theta;
    this.next = new Int32Array(capacity);
    this.all = new Int32Array(capacity).map((_, i) => i);
    this.reserve(capacity * 2);
  }

  /** The tree over these particles: all of them, or just the indices given. */
  build(particles: Particles, indices?: ArrayLike<number>) {
    this.particles = particles;
    this.indices = indices ?? this.all.subarray(0, particles.count);
    this.cells = 0;
    const p = particles.positions;
    const ids = this.indices;
    if (!ids.length) return;

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let k = 0; k < ids.length; k++) {
      const o = ids[k] * 3;
      minX = Math.min(minX, p[o]);
      minY = Math.min(minY, p[o + 1]);
      minZ = Math.min(minZ, p[o + 2]);
      maxX = Math.max(maxX, p[o]);
      maxY = Math.max(maxY, p[o + 1]);
      maxZ = Math.max(maxZ, p[o + 2]);
    }
    const half = Math.max(maxX - minX, maxY - minY, maxZ - minZ, MIN_DISTANCE) / 2;
    this.cell((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2, half);
    for (let k = 0; k < ids.length; k++) this.insert(ids[k]);
    this.summarise();
  }

  /**
   * Pushes every particle from every other by strength × both masses / distance², fading to nothing
   * at radius, as `repel` does pair by pair.
   */
  repel(strength: number, radius = Infinity) {
    const p = this.particles;
    if (!p || !this.cells) return;
    const ids = this.indices;
    for (let k = 0; k < ids.length; k++) this.push(p, ids[k], strength, radius);
  }

  private push(p: Particles, i: number, strength: number, radius: number) {
    const { bounds, sums, children, body, next, stack } = this;
    const at = p.positions;
    const x = at[i * 3];
    const y = at[i * 3 + 1];
    const z = at[i * 3 + 2];
    const r2 = radius * radius;
    const theta2 = this.theta * this.theta;
    const scale = strength * p.masses[i];
    let fx = 0;
    let fy = 0;
    let fz = 0;

    let top = 0;
    stack[top++] = 0;
    while (top) {
      const n = stack[--top];
      if (!sums[n * 4 + 3]) continue;
      if (body[n] >= 0) {
        for (let j = body[n]; j !== EMPTY; j = next[j]) {
          if (j === i) continue;
          const dx = x - at[j * 3];
          const dy = y - at[j * 3 + 1];
          const dz = z - at[j * 3 + 2];
          const f = falloff(dx * dx + dy * dy + dz * dz, r2) * scale * p.masses[j];
          fx += dx * f;
          fy += dy * f;
          fz += dz * f;
        }
        continue;
      }
      const dx = x - sums[n * 4];
      const dy = y - sums[n * 4 + 1];
      const dz = z - sums[n * 4 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      const half = bounds[n * 4 + 3];
      // A cell holding the particle always opens: summed, it would push the particle off itself.
      const inside =
        Math.abs(x - bounds[n * 4]) <= half &&
        Math.abs(y - bounds[n * 4 + 1]) <= half &&
        Math.abs(z - bounds[n * 4 + 2]) <= half;
      if (!inside && 4 * half * half < theta2 * d2) {
        const f = falloff(d2, r2) * scale * sums[n * 4 + 3];
        fx += dx * f;
        fy += dy * f;
        fz += dz * f;
        continue;
      }
      for (let c = 0; c < 8; c++) {
        const child = children[n * 8 + c];
        if (child !== EMPTY) stack[top++] = child;
      }
    }
    p.applyForce(i, fx, fy, fz);
  }

  private insert(i: number) {
    const p = this.particles!.positions;
    this.next[i] = EMPTY;
    let n = 0;
    for (let depth = 0; ; depth++) {
      const held = this.body[n];
      if (held === EMPTY) {
        this.body[n] = i;
        return;
      }
      if (held >= 0) {
        if (depth >= MAX_DEPTH) {
          this.next[i] = this.next[held];
          this.next[held] = i;
          return;
        }
        // Split the leaf: its one particle moves down a level, then this one carries on.
        this.body[n] = INTERNAL;
        this.body[this.childFor(n, p[held * 3], p[held * 3 + 1], p[held * 3 + 2])] = held;
      }
      n = this.childFor(n, p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    }
  }

  /** The child cell a point falls in, made if missing. */
  private childFor(n: number, x: number, y: number, z: number): number {
    const b = this.bounds;
    const cx = b[n * 4];
    const cy = b[n * 4 + 1];
    const cz = b[n * 4 + 2];
    const octant = (x >= cx ? 1 : 0) | (y >= cy ? 2 : 0) | (z >= cz ? 4 : 0);
    const existing = this.children[n * 8 + octant];
    if (existing !== EMPTY) return existing;
    const q = b[n * 4 + 3] / 2;
    const child = this.cell(
      cx + (octant & 1 ? q : -q),
      cy + (octant & 2 ? q : -q),
      cz + (octant & 4 ? q : -q),
      q,
    );
    this.children[n * 8 + octant] = child;
    return child;
  }

  private cell(x: number, y: number, z: number, half: number): number {
    if (this.cells >= this.cellCapacity) this.reserve(this.cellCapacity * 2);
    const n = this.cells++;
    const b = this.bounds;
    b[n * 4] = x;
    b[n * 4 + 1] = y;
    b[n * 4 + 2] = z;
    b[n * 4 + 3] = half;
    this.children.fill(EMPTY, n * 8, n * 8 + 8);
    this.body[n] = EMPTY;
    return n;
  }

  /**
   * Centre of mass and mass of each cell. Children are always made after their parent, so walking
   * the cells backwards sums every child before its parent: no recursion.
   */
  private summarise() {
    const p = this.particles!;
    const { sums, children, body, next } = this;
    for (let n = this.cells - 1; n >= 0; n--) {
      let mass = 0;
      let x = 0;
      let y = 0;
      let z = 0;
      if (body[n] >= 0) {
        for (let j = body[n]; j !== EMPTY; j = next[j]) {
          const m = p.masses[j];
          mass += m;
          x += p.positions[j * 3] * m;
          y += p.positions[j * 3 + 1] * m;
          z += p.positions[j * 3 + 2] * m;
        }
      } else {
        for (let c = 0; c < 8; c++) {
          const child = children[n * 8 + c];
          if (child === EMPTY) continue;
          const m = sums[child * 4 + 3];
          mass += m;
          x += sums[child * 4] * m;
          y += sums[child * 4 + 1] * m;
          z += sums[child * 4 + 2] * m;
        }
      }
      sums[n * 4 + 3] = mass;
      if (mass) {
        sums[n * 4] = x / mass;
        sums[n * 4 + 1] = y / mass;
        sums[n * 4 + 2] = z / mass;
      }
    }
  }

  /** Room for more cells: only past the most ever needed, so it settles after the first frames. */
  private reserve(capacity: number) {
    const bounds = new Float64Array(capacity * 4);
    const sums = new Float64Array(capacity * 4);
    const children = new Int32Array(capacity * 8);
    const body = new Int32Array(capacity);
    bounds.set(this.bounds);
    sums.set(this.sums);
    children.set(this.children);
    body.set(this.body);
    this.bounds = bounds;
    this.sums = sums;
    this.children = children;
    this.body = body;
    this.cellCapacity = capacity;
  }
}

/** Inverse-square over distance (so it scales a displacement), faded to nothing at radius. */
function falloff(d2: number, r2: number): number {
  if (d2 >= r2) return 0;
  const fade = r2 === Infinity ? 1 : (1 - d2 / r2) ** 2;
  const distance = Math.max(Math.sqrt(d2), MIN_DISTANCE);
  return fade / (distance * distance * distance);
}
