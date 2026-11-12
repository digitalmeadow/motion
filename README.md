# @digitalmeadow/motion

Minimal motion primitives for creative coding: interpolation, easings, springs and particle physics.

## Installation

```bash
npm install @digitalmeadow/motion
```

## Features

- Dependency-free
- Minimal API, plain numbers and flat `Float32Array`s (GPU-ready)
- Frame-rate independent: everything takes a delta in seconds
- Springs solved exactly, stable at any stiffness and frame time

## Usage

### Linear and easings

```typescript
import { easings, cubicBezier, lerp, progress } from "@digitalmeadow/motion";

const t = progress(elapsed, 0.6); // 0 → 1, clamped
const x = lerp(from, to, easings.quartOut(t));

const ease = cubicBezier(0.25, 0.1, 0.25, 1); // CSS "ease"
```

Every Penner curve, `in` / `out` / `inOut`: `quad`, `cubic`, `quart`, `quint`, `sine`, `expo`, `circ`, `back`, `elastic`, `bounce`. Plus `cubicBezier()` and `steps()` as in CSS.

### Smoothing

```typescript
import { damp } from "@digitalmeadow/motion";

// Eases toward the target at the same speed at 30 Hz or 144 Hz.
value = damp(value, target, 5, delta);
```

### Tween

```typescript
import { Tween } from "@digitalmeadow/motion";

const opacity = new Tween(0, { duration: 0.4, ease: "cubicOut" });
opacity.start(1);

function frame(delta: number) {
  opacity.update(delta);
}
```

### Spring

```typescript
import { Spring } from "@digitalmeadow/motion";

const x = new Spring(0, { stiffness: 170, damping: 26 });
// or perceptually, as SwiftUI: new Spring(0, { duration: 0.5, bounce: 0.3 })

x.target = 100; // retarget any time: velocity carries over

function frame(delta: number) {
  x.update(delta);
  if (x.atRest) stop();
}
```

### Particle physics

```typescript
import { FixedTimestep, Particles, SpatialHash, spring, repel, attract } from "@digitalmeadow/motion";

const particles = new Particles(1000, { drag: 2 });
const hash = new SpatialHash(4, 1000);
const timestep = new FixedTimestep(1 / 60);
const link = { length: 2, stiffness: 30, damping: 2 };

function frame(delta: number) {
  timestep.update(delta, (dt) => {
    hash.build(particles);
    hash.forEachPair((a, b) => repel(particles, a, b, 20, 4));
    for (const [a, b] of edges) spring(particles, a, b, link);
    for (let i = 0; i < particles.count; i++) attract(particles, i, 0, 0, 0, 0.1);
    particles.integrate(dt);
  });
}
```

- `Particles`: point masses with `drag` (viscous), `friction` (dry: brings things to a stop), `maxSpeed`, `pinned` and `disabled` (taken out, index kept). Semi-implicit Euler.
- Forces: `spring` (damped Hooke), `attract` (to a point), `repel` (inverse-square, fading to zero at a radius), `drag` (relative to a reference velocity).
- `SpatialHash`: neighbour pairs in linear time, for short-range forces.
- `BarnesHut`: long-range repulsion between all pairs in O(n log n), by octree. `build`, then `repel`; no garbage per frame.
- `ParticleGroups`: groups that move as wholes. `gather`, put forces on `bodies`, `scatter`: each member gets its share by mass, so the group moves without deforming.
- `FixedTimestep`: equal steps whatever the frame rate.
