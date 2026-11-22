/**
 * The intro's timeline, ported from the mobile app's intro (lib/screens/intro.dart and lib/widgets/logo.dart)
 * so both look the same. Times are on the mobile 6-second timeline; the web plays it a little faster.
 */

/** The web twist: teacher and admin things circle the logo (the phone shows children's things). */
export const ORBIT = ['laptop', 'school', 'memo', 'globe', 'books', 'phone', 'open-book', 'star'];
/** The yellow line under the tagline (the phone says "Kahit Walang Signal"). */
export const EXTRA = 'Konektado sa Bawat Sentro';

export const TOTAL_MS = 6000;
const BASE_MS = 3600;

// The wordmark's area inside the 651 x 206 logo artwork, and each letter's x range (P o c k e t · L e s s o n s).
export const X0 = 196;
const X1 = 638;
export const Y0 = 30;
const Y1 = 156;
export const EXTRA_X = 432;
export const ART_W = 651;
export const ART_H = 206;
const LETTERS: ReadonlyArray<readonly [number, number]> = [
  [202, 241], [243, 274], [277, 304], [307, 342], [343, 371], [372, 394],
  [411, 446], [448, 476], [479, 504], [507, 532], [535, 566], [569, 604], [606, 631],
];
export const LETTER_COUNT = LETTERS.length;

// ---- easing (the Flutter curves the phone uses) ----
type Curve = (x: number) => number;
const linear: Curve = (x) => x;
const easeOut: Curve = (x) => 1 - (1 - x) * (1 - x);
const easeOutCubic: Curve = (x) => 1 - Math.pow(1 - x, 3);
const easeInOutCubic: Curve = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOut: Curve = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeOutBack: Curve = (x) => {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const elasticOut: Curve = (x) => {
  if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
  const p = 0.4;
  return Math.pow(2, -10 * x) * Math.sin(((x - p / 4) * 2 * Math.PI) / p) + 1;
};
export const easeInCubic: Curve = (x) => x * x * x;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Rounds for CSS, so a finished movement reads exactly 0 (sin(π) leaves tiny leftovers). */
const n = (v: number) => (Math.abs(v) < 0.0005 ? 0 : Math.round(v * 1000) / 1000);
export const span = (v: number, a: number, b: number, c: Curve = linear) => c(clamp01((v - a) / (b - a)));

const SUN = [0xf6, 0xcc, 0x59];
const TEAL = [0x14, 0x6b, 0x60];
const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export interface Geometry {
  w: number;
  h: number;
  wide: boolean;
  cx: number;
  cy: number;
  radius: number;
  wordW: number;
  wordH: number;
  wordLeft: number;
  wordTop: number;
  /** px per artwork unit for the wordmark */
  u: number;
  /** the wordmark's width in artwork units (wider than the logo, to fit the yellow line) */
  span: number;
  barW: number;
}

/** Where everything sits for a window of w x h. `extraWidth` = the yellow line's width in artwork units. */
export function geometry(w: number, h: number, extraWidth: number): Geometry {
  const compact = h < 700;
  const wide = w >= 900;
  const cx = w / 2;
  const cy = h * (compact ? 0.3 : 0.34);
  const radius = Math.min(Math.min(w, h) * (compact ? 0.27 : 0.35), 210);
  const wordW = Math.min(w - 40, wide ? 560 : 360);
  const spanUnits = Math.max(X1, EXTRA_X + extraWidth + 6) - X0;
  const u = wordW / spanUnits;
  const wordH = (Y1 - Y0) * u;
  const orbitBottom = cy + radius * 0.82 + 30;
  const barTop = h - 84 - 44;
  const wordTop = orbitBottom + Math.max(0, barTop - orbitBottom - wordH) * 0.55;
  return { w, h, wide, cx, cy, radius, wordW, wordH, wordLeft: (w - wordW) / 2, wordTop, u, span: spanUnits, barW: Math.max(160, Math.min(520, w - 130)) };
}

export interface OrbitItem {
  src: string;
  size: number;
  transform: string;
  opacity: number;
}
export interface LetterLayer {
  transform: string;
  origin: string;
  opacity: number;
  filter: string;
}
export interface Frame {
  background: string;
  burst: { opacity: number; transform: string };
  confetti: number;
  orbit: OrbitItem[];
  disc: { transform: string; shadow: string };
  icon: { show: boolean; transform: string; sunOpacity: number; sunTransform: string; sparkTransform: string };
  letters: LetterLayer[];
  wordShow: boolean;
  bar: string;
  barFilter: string;
  tagClip: string;
  tagFilter: string;
  extra: string;
  caret: { show: boolean; left: number };
  loaderOpacity: number;
  statusOpacity: number;
  /** The rocket bar's own progress (0–1) before the connection is taken into account. */
  barAnim: number;
  settled: boolean;
}

/**
 * One frame of the intro.
 * m = time on the 6 s mobile timeline (ms) · loop = 0–1 over 6 s for the gentle floating
 * dim = 0–1, greys the scene when there is no connection · measure = width of text in artwork units.
 */
export function frame(m: number, loop: number, g: Geometry, dim: number, measure: (s: string) => number): Frame {
  const iv = (a: number, b: number, c: Curve = easeOut) => c(clamp01(((m * TOTAL_MS) / BASE_MS / TOTAL_MS - a) / (b - a)));
  const ms = (a: number, b: number, c: Curve = linear) => span(m, a, b, c);
  const sun = iv(0, 0.32, elasticOut);
  const rays = iv(0.05, 0.4) * (1 - 0.85 * dim);
  const tau = Math.PI * 2;

  // orbiting things fly in from far away
  const orbit: OrbitItem[] = ORBIT.map((name, i) => {
    const p = iv(0.08 + i * 0.045, 0.42 + i * 0.045, easeOutBack);
    const a = (i * tau) / ORBIT.length + loop * tau * 0.25;
    const r = g.radius * (1 + (1 - p) * 2.4);
    const bob = Math.sin(loop * tau * 2 + i) * 6;
    const size = (44 + (i % 2 === 0 ? 10 : 0)) * (g.wide ? 1.2 : 1);
    const x = g.cx + Math.cos(a) * r - size / 2;
    const y = g.cy + Math.sin(a) * r * 0.82 - size / 2 + bob;
    const rot = Math.sin(loop * tau + i) * 0.18;
    return { src: `icons3d/${name}.webp`, size, transform: `translate(${n(x)}px, ${n(y)}px) rotate(${n(rot)}rad)`, opacity: n(clamp01(p) * (1 - 0.6 * dim)) };
  });

  // the logo icon flips in inside the glowing disc, then its sun rises
  const grow = ms(400, 1300, easeOutCubic);
  const settle = ms(1300, 1750, easeOutBack);
  const iconScale = m < 1300 ? 0.08 + 1.22 * grow : 1.3 - 0.3 * settle;
  const flip = tau * ms(400, 1300, easeInOutCubic);
  const wobble = settle >= 1 ? Math.sin(loop * tau) * 0.05 : 0;
  const iconT = ms(1600, 2900);
  const sunRise = span(iconT, 0, 0.45, easeOutBack);
  const iconRays = span(iconT, 0.3, 0.75, easeOutBack);
  const spark = span(iconT, 0.6, 1, elasticOut);
  const iu = 96 / 160;

  // the wordmark bursts out of the pocket
  const t = ms(2600, 5800);
  const u = g.u;
  const origin = { x: g.cx - g.wordLeft, y: g.cy + 22 - g.wordTop };
  const shine = span(t, 0.9, 1, easeInOut);
  const band = shine * 1.4 - 0.2;
  const shineAt = (x: number) => (shine <= 0 || shine >= 1 ? 1 : 1 + 0.7 * Math.max(0, 1 - Math.abs((x - X0) / g.span - band) / 0.1));
  const letters: LetterLayer[] = LETTERS.map(([a, b], i) => {
    const p = span(t, i * 0.032, 0.2 + i * 0.032);
    const move = easeOutCubic(p);
    const growL = easeOutBack(p);
    const ex = ((a + b) / 2 - X0) * u;
    const ey = (72 - Y0) * u;
    const sx = origin.x - ex;
    const sy = origin.y - ey;
    const arc = -Math.sin(p * Math.PI) * 46 * u;
    const wave = span(t, 0.56 + i * 0.008, 0.66 + i * 0.008);
    const ripple = -Math.sin(wave * Math.PI) * 7 * u;
    const angle = (i % 2 === 0 ? 1 : -1) * 1.4 * (1 - move);
    const scale = Math.max(0.001, 0.15 + 0.85 * growL);
    return {
      transform: `translate(${n(sx * (1 - move))}px, ${n(sy * (1 - move) + arc + ripple)}px) rotate(${n(angle)}rad) scale(${n(scale)})`,
      origin: `${ex}px ${ey}px`,
      opacity: clamp01(p * 4),
      filter: `brightness(${shineAt((a + b) / 2)})`,
    };
  });
  const bar = span(t, 0.68, 0.76, easeOutBack);
  const type = span(t, 0.72, 0.83);
  const typeExtra = span(t, 0.84, 0.95);
  const shown = EXTRA.substring(0, Math.round(EXTRA.length * typeExtra));
  const caretX = typeExtra > 0 ? EXTRA_X + (shown ? measure(shown) : 0) + 2 : 242 + (424 - 240) * type;
  const reveal = (240 - X0 + (424 - 240) * type) * u;

  return {
    background: `radial-gradient(circle ${1.1 * Math.min(g.w, g.h)}px at ${g.cx}px ${g.cy}px, ${mix(TEAL, SUN, 0.35 * rays)} 0%, #146B60 45%, #0A3F38 100%)`,
    burst: { opacity: 0.22 * rays, transform: `rotate(${(loop * tau) / 3}rad)` },
    confetti: 0.55 * rays,
    orbit,
    disc: {
      transform: `scale(${0.2 + 0.8 * sun})`,
      shadow: `0 0 60px 16px rgba(246, 204, 89, ${0.75 * rays}), 0 0 18px 2px rgba(255, 255, 255, ${0.5 * rays})`,
    },
    icon: {
      show: m >= 400,
      transform: `perspective(${1 / 0.0015}px) rotateY(${flip}rad) scale(${Math.max(0.001, iconScale)}) rotate(${wobble}rad)`,
      sunOpacity: clamp01(sunRise),
      sunTransform: `translateY(${30 * iu * (1 - sunRise)}px) scale(${Math.max(0.001, 0.4 + 0.6 * iconRays)})`,
      sparkTransform: `scale(${Math.max(0.001, spark)})`,
    },
    letters,
    wordShow: t > 0,
    bar: `scaleX(${Math.max(0.001, bar)})`,
    barFilter: `brightness(${shineAt(220)})`,
    tagClip: `inset(0 ${Math.max(0, g.wordW - reveal)}px 0 0)`,
    tagFilter: `brightness(${shineAt(330)})`,
    extra: shown,
    caret: { show: type > 0 && t < 0.97 && (Math.sin(t * Math.PI * 40) > 0 || type < 1), left: (caretX - X0) * u },
    loaderOpacity: iv(0.38, 0.5),
    statusOpacity: iv(0.45, 0.6),
    barAnim: span(m, 1440, 5760, easeInOutCubic),
    settled: m >= 1750,
  };
}
