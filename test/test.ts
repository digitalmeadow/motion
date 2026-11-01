import {
  attract,
  damp,
  easings,
  FixedTimestep,
  Particles,
  repel,
  SpatialHash,
  Spring,
  spring,
  Tween,
  type Ease,
} from "../src";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
addEventListener("resize", resize);
resize();

const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointermove", (e) => Object.assign(pointer, { x: e.clientX, y: e.clientY }));

// Three followers: exact spring, tween restarted on each move, plain exponential damp.
const springX = new Spring(pointer.x, { duration: 0.6, bounce: 0.35 });
const springY = new Spring(pointer.y, { duration: 0.6, bounce: 0.35 });
const tweenX = new Tween(pointer.x, { duration: 0.6, ease: "backOut" });
const tweenY = new Tween(pointer.y, { duration: 0.6, ease: "backOut" });
const damped = { x: pointer.x, y: pointer.y };

// A ring of particles on springs, pushing apart, pulled to the pointer.
const COUNT = 60;
const particles = new Particles(COUNT, { drag: 2 });
const hash = new SpatialHash(60, COUNT, 256);
const timestep = new FixedTimestep();
const link = { length: 30, stiffness: 40, damping: 2 };
for (let i = 0; i < COUNT; i++) {
  const angle = (i / COUNT) * Math.PI * 2;
  particles.add(pointer.x + Math.cos(angle) * 200, pointer.y + Math.sin(angle) * 200, 0);
}

const curves: Ease[] = ["quartOut", "sineInOut", "backOut", "elasticOut", "bounceOut", "expoInOut"];

let last = performance.now();
function frame(now: number) {
  const delta = Math.min((now - last) / 1000, 1 / 15);
  last = now;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  springX.target = pointer.x;
  springY.target = pointer.y;
  if (tweenX.target !== pointer.x || tweenY.target !== pointer.y) {
    tweenX.start(pointer.x);
    tweenY.start(pointer.y);
  }
  springX.update(delta);
  springY.update(delta);
  tweenX.update(delta);
  tweenY.update(delta);
  damped.x = damp(damped.x, pointer.x, 6, delta);
  damped.y = damp(damped.y, pointer.y, 6, delta);

  timestep.update(delta, (dt) => {
    hash.build(particles);
    hash.forEachPair((a, b) => repel(particles, a, b, 40000, 60));
    for (let i = 0; i < COUNT; i++) {
      spring(particles, i, (i + 1) % COUNT, link);
      attract(particles, i, pointer.x, pointer.y, 0, 0.5);
    }
    particles.integrate(dt);
  });

  const p = particles.positions;
  ctx.strokeStyle = "#5a6b75";
  ctx.beginPath();
  for (let i = 0; i <= COUNT; i++) {
    const j = (i % COUNT) * 3;
    if (i === 0) ctx.moveTo(p[j], p[j + 1]);
    else ctx.lineTo(p[j], p[j + 1]);
  }
  ctx.stroke();

  dot(springX.value, springY.value, "#e67e80", 10);
  dot(tweenX.value, tweenY.value, "#a7c080", 10);
  dot(damped.x, damped.y, "#7fbbb3", 10);

  curves.forEach((ease, i) => plot(ease, 24 + i * 110, h - 24));
  requestAnimationFrame(frame);
}

function dot(x: number, y: number, color: string, radius: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function plot(ease: Ease, x: number, y: number) {
  const size = 90;
  ctx.strokeStyle = "#d3c6aa";
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const py = y - easings[ease](t) * size * 0.7;
    if (i === 0) ctx.moveTo(x + t * size, py);
    else ctx.lineTo(x + t * size, py);
  }
  ctx.stroke();
  ctx.fillStyle = "#859289";
  ctx.font = "11px monospace";
  ctx.fillText(ease, x, y + 14);
}

requestAnimationFrame(frame);
