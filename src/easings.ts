export type EasingFunction = (t: number) => number;

export type Ease =
  | "linear"
  | "quadIn"
  | "quadOut"
  | "quadInOut"
  | "cubicIn"
  | "cubicOut"
  | "cubicInOut"
  | "quartIn"
  | "quartOut"
  | "quartInOut"
  | "quintIn"
  | "quintOut"
  | "quintInOut"
  | "sineIn"
  | "sineOut"
  | "sineInOut"
  | "expoIn"
  | "expoOut"
  | "expoInOut"
  | "circIn"
  | "circOut"
  | "circInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "elasticIn"
  | "elasticOut"
  | "elasticInOut"
  | "bounceIn"
  | "bounceOut"
  | "bounceInOut";

/** Penner's overshoot for back easings: about 10%. */
const BACK = 1.70158;
const BACK_IN_OUT = BACK * 1.525;
const ELASTIC = (2 * Math.PI) / 3;
const ELASTIC_IN_OUT = (2 * Math.PI) / 4.5;

const powIn = (power: number) => (t: number) => t ** power;
const powOut = (power: number) => (t: number) => 1 - (1 - t) ** power;
const powInOut = (power: number) => (t: number) =>
  t < 0.5 ? 2 ** (power - 1) * t ** power : 1 - (-2 * t + 2) ** power / 2;

function bounceOut(t: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

/** Every curve maps 0 → 0 and 1 → 1; back and elastic overshoot between. */
export const easings: Record<Ease, EasingFunction> = {
  linear: (t) => t,

  quadIn: powIn(2),
  quadOut: powOut(2),
  quadInOut: powInOut(2),

  cubicIn: powIn(3),
  cubicOut: powOut(3),
  cubicInOut: powInOut(3),

  quartIn: powIn(4),
  quartOut: powOut(4),
  quartInOut: powInOut(4),

  quintIn: powIn(5),
  quintOut: powOut(5),
  quintInOut: powInOut(5),

  sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  expoIn: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  expoOut: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  expoInOut: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
  },

  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - (t - 1) ** 2),
  circInOut: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2,

  backIn: (t) => (BACK + 1) * t ** 3 - BACK * t * t,
  backOut: (t) => 1 + (BACK + 1) * (t - 1) ** 3 + BACK * (t - 1) ** 2,
  backInOut: (t) =>
    t < 0.5
      ? ((2 * t) ** 2 * ((BACK_IN_OUT + 1) * 2 * t - BACK_IN_OUT)) / 2
      : ((2 * t - 2) ** 2 * ((BACK_IN_OUT + 1) * (t * 2 - 2) + BACK_IN_OUT) + 2) / 2,

  elasticIn: (t) => {
    if (t === 0 || t === 1) return t;
    return -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ELASTIC);
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC) + 1;
  },
  elasticInOut: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * ELASTIC_IN_OUT)) / 2
      : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * ELASTIC_IN_OUT)) / 2 + 1;
  },

  bounceIn: (t) => 1 - bounceOut(1 - t),
  bounceOut,
  bounceInOut: (t) => (t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2),
};

/** A name or a curve: everything that takes an ease takes either. */
export function toEasing(ease: Ease | EasingFunction): EasingFunction {
  return typeof ease === "function" ? ease : easings[ease];
}

/** CSS's cubic-bezier(): control points (x1, y1) and (x2, y2), x within 0–1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // Each coordinate is a cubic in the curve's parameter s: a·s³ + b·s² + c·s.
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;

  // Newton's method is fast where the curve is steep; bisection catches the flat spots.
  const solve = (t: number) => {
    let s = t;
    for (let i = 0; i < 8; i++) {
      const slope = dx(s);
      if (Math.abs(slope) < 1e-6) break;
      const error = x(s) - t;
      if (Math.abs(error) < 1e-7) return s;
      s -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    while (hi - lo > 1e-7) {
      if (x(s) < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };

  return (t) => (t <= 0 || t >= 1 ? t : y(solve(t)));
}

/** CSS's steps(): holds each of count levels, jumping at the start or end of each. */
export function steps(count: number, jump: "start" | "end" = "end"): EasingFunction {
  return (t) => {
    // jump-start is already one step up at 0, as CSS's.
    const step = Math.floor(t * count) + (jump === "start" ? 1 : 0);
    return Math.min(Math.max(step / count, 0), 1);
  };
}
