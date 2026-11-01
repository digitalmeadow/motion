import type { Particles } from "./Particles";

/**
 * Finds particles near each other without testing every pair: each goes in a grid cell, and only
 * neighbouring cells are compared. Cost grows with the count, not its square.
 */
export class SpatialHash {
  private head: Int32Array;
  private next: Int32Array;
  private cells: Int32Array;
  private count = 0;

  /**
   * @param cellSize the furthest apart a pair can be and still be found.
   * @param buckets hash table size: a power of two, comfortably above the particle count.
   */
  constructor(
    readonly cellSize: number,
    capacity: number,
    buckets = 4096,
  ) {
    this.head = new Int32Array(buckets);
    this.next = new Int32Array(capacity);
    this.cells = new Int32Array(capacity * 3);
  }

  build(particles: Particles) {
    const p = particles.positions;
    this.count = particles.count;
    this.head.fill(-1);
    for (let i = 0; i < this.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        this.cells[i * 3 + axis] = Math.floor(p[i * 3 + axis] / this.cellSize);
      }
      const h = this.hash(this.cells[i * 3], this.cells[i * 3 + 1], this.cells[i * 3 + 2]);
      this.next[i] = this.head[h];
      this.head[h] = i;
    }
  }

  /** Every pair in neighbouring cells, each once. Some will be further than cellSize apart. */
  forEachPair(visit: (a: number, b: number) => void) {
    const c = this.cells;
    for (let a = 0; a < this.count; a++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const x = c[a * 3] + dx;
            const y = c[a * 3 + 1] + dy;
            const z = c[a * 3 + 2] + dz;
            for (let b = this.head[this.hash(x, y, z)]; b !== -1; b = this.next[b]) {
              // Distant cells share buckets: only the cell asked for counts, so no pair is seen twice.
              if (b <= a || c[b * 3] !== x || c[b * 3 + 1] !== y || c[b * 3 + 2] !== z) continue;
              visit(a, b);
            }
          }
        }
      }
    }
  }

  private hash(x: number, y: number, z: number): number {
    const h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
    return h & (this.head.length - 1);
  }
}
