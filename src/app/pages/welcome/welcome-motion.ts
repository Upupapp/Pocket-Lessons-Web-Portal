/**
 * The three welcome pages and their motion, ported from the mobile app's onboarding
 * (lib/screens/intro.dart: _pages, _Hero, _BottomCard) so the web looks and moves the same.
 * Pure functions: the component only renders what these return.
 */

export type Lang = 'en' | 'fil';
type Pair = readonly [en: string, fil: string];

export interface Floater {
  icon: string;
  x: number;
  y: number;
  size: number;
  depth?: number;
  phase?: number;
}

export interface WelcomePage {
  bg: readonly [top: string, bottom: string];
  accent: string;
  glow: string;
  hero: string;
  orbit?: boolean;
  floaters: Floater[];
  title: Pair;
  body: Pair;
}

/** Same colours, pictures and story beats as the phone; the words speak to teachers. */
export const PAGES: WelcomePage[] = [
  {
    bg: ['#FFD66B', '#FFF4D6'],
    accent: '#146B60',
    glow: '#FFF0B3',
    hero: 'open-book',
    floaters: [
      { icon: 'sun', x: 0.8, y: 0.14, size: 74, depth: 0.5, phase: 0.3 },
      { icon: 'kite', x: 0.16, y: 0.18, size: 58, depth: 1.3, phase: 1.1 },
      { icon: 'owl', x: 0.18, y: 0.66, size: 66, depth: 1.6, phase: 2.0 },
      { icon: 'pencil', x: 0.84, y: 0.62, size: 54, depth: 1.8, phase: 2.7 },
      { icon: 'star', x: 0.62, y: 0.86, size: 40, depth: 2.2, phase: 0.8 },
      { icon: 'sparkles', x: 0.3, y: 0.42, size: 34, depth: 0.8, phase: 1.9 },
      { icon: 'balloon', x: 0.66, y: 0.3, size: 44, depth: 1.1, phase: 3.3 },
    ],
    title: ['Lessons in every pocket', 'Aralin sa bawat bulsa'],
    body: [
      'Your voice and stories, saved on each family’s phone. Children keep learning with no load and no signal.',
      'Ang iyong boses at mga kuwento, naka-save sa phone ng bawat pamilya. Tuloy ang pagkatuto kahit walang load o signal.',
    ],
  },
  {
    bg: ['#8CC7E8', '#E4F2FA'],
    accent: '#2B5FC1',
    glow: '#D7EEFB',
    hero: 'memo',
    orbit: true,
    floaters: ['open-book', 'pencil', 'palette', 'crayon', 'books', 'laptop', 'phone', 'star', 'sparkles'].map((icon, i) => ({
      icon,
      x: 0,
      y: 0,
      size: i % 2 ? 46 : 50,
    })),
    title: ['Make a lesson in minutes', 'Gumawa ng aralin sa loob ng ilang minuto'],
    body: [
      'Type a short story, add a picture and read each page aloud. Lessons follow each child’s reading level.',
      'Mag-type ng maikling kuwento, maglagay ng larawan, at basahin nang malakas ang bawat pahina. Sumusunod ang bawat aralin sa antas ng pagbasa ng bata.',
    ],
  },
  {
    bg: ['#9FDDB4', '#E1F1DD'],
    accent: '#0F544B',
    glow: '#E9F8EA',
    hero: 'trophy',
    floaters: [
      { icon: 'girl', x: 0.2, y: 0.62, size: 76, depth: 1.5, phase: 0.4 },
      { icon: 'boy', x: 0.8, y: 0.6, size: 72, depth: 1.6, phase: 1.6 },
      { icon: 'school', x: 0.18, y: 0.16, size: 58, depth: 0.7, phase: 2.2 },
      { icon: 'hugging', x: 0.82, y: 0.16, size: 56, depth: 0.9, phase: 0.9 },
      { icon: 'sun-face', x: 0.52, y: 0.06, size: 44, depth: 0.5, phase: 2.9 },
      { icon: 'medal-1', x: 0.36, y: 0.88, size: 40, depth: 2.0, phase: 1.3 },
      { icon: 'heart-ribbon', x: 0.68, y: 0.88, size: 40, depth: 2.1, phase: 3.1 },
    ],
    title: ['See every child shine', 'Makitang kuminang ang bawat bata'],
    body: [
      'Reading checks and progress charts show who is moving up and who needs a hand.',
      'Makikita sa mga pagsusuri sa pagbasa at sa mga tsart kung sino ang umaangat at sino ang kailangang tulungan.',
    ],
  },
];

/** The words around the pages, in both languages. */
export const WORDS = {
  next: ['Next', 'Susunod'] as Pair,
  back: ['Back', 'Bumalik'] as Pair,
  start: ['Get started', 'Magsimula na'] as Pair,
  language: ['Language', 'Wika'] as Pair,
  page: ['Page', 'Pahina'] as Pair,
  of: ['of', 'sa'] as Pair,
  region: ['Welcome to Pocket Lessons', 'Maligayang pagdating sa Pocket Lessons'] as Pair,
};

export const say = (p: Pair, lang: Lang) => (lang === 'fil' ? p[1] : p[0]);

/** Every picture the pages show, so they can load before the first move. */
export const ALL_ICONS = [...new Set(PAGES.flatMap((p) => [p.hero, ...p.floaters.map((f) => f.icon)]))];

// ---------- colour ----------

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** A colour between a and b (t = 0..1), as css rgb()/rgba(). */
export function mix(a: string, b: string, t: number, alpha = 1): string {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * Math.min(1, Math.max(0, t))));
  return alpha >= 1 ? `rgb(${c.join(', ')})` : `rgba(${c.join(', ')}, ${alpha})`;
}

/** The page colours at a position between pages (pos = 0..2), blended like the phone does. */
export function colorsAt(pos: number): { top: string; bottom: string; accent: string; accentGlow: string } {
  const i = Math.min(PAGES.length - 1, Math.max(0, Math.floor(pos)));
  const j = Math.min(PAGES.length - 1, i + 1);
  const f = Math.min(1, Math.max(0, pos - i));
  return {
    top: mix(PAGES[i].bg[0], PAGES[j].bg[0], f),
    bottom: mix(PAGES[i].bg[1], PAGES[j].bg[1], f),
    accent: mix(PAGES[i].accent, PAGES[j].accent, f),
    accentGlow: mix(PAGES[i].accent, PAGES[j].accent, f, 0.45),
  };
}

/** A page dot: 10 px, stretching to 32 px as its page comes in, taking the page colour. */
export function dot(d: number, pos: number, accent: string): { width: number; color: string } {
  const near = Math.min(1, Math.max(0, 1 - Math.abs(pos - d)));
  return { width: 10 + 22 * near, color: near <= 0 ? '#E8E0CE' : mixCss('#E8E0CE', accent, near) };
}

/** Like mix(), but the second colour may already be an rgb() string. */
function mixCss(a: string, b: string, t: number): string {
  const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(b);
  if (!m) return mix(a, b, t);
  const hex = '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
  return mix(a, hex, t);
}

// ---------- moving between pages ----------

export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Where a drag past the first or last page stops: it gives way, like a rubber band. */
export function rubber(pos: number): number {
  const last = PAGES.length - 1;
  if (pos < 0) return pos * 0.35;
  if (pos > last) return last + (pos - last) * 0.35;
  return pos;
}

/**
 * Which page a drag settles on. A quick flick or a drag past about a fifth of the stage turns the page;
 * never more than one page from where the drag started.
 * @param velocity stage widths per second (negative = towards the next page)
 */
export function settle(pos: number, startPage: number, velocity: number): number {
  const projected = pos - velocity * 0.18;
  let target = Math.round(projected);
  if (Math.abs(pos - startPage) > 0.18 && target === startPage) target = pos > startPage ? startPage + 1 : startPage - 1;
  target = Math.min(startPage + 1, Math.max(startPage - 1, target));
  return Math.min(PAGES.length - 1, Math.max(0, target));
}

// ---------- one page's picture at a moment ----------

export interface Placed {
  icon: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  opacity: number;
}

export interface SceneView {
  k: number;
  /** How far the whole page has slid, in px (the page itself, before the layers' extra parallax). */
  shift: number;
  opacity: number;
  glow: { x: number; y: number; size: number; color: string };
  burst: { x: number; y: number; size: number; rotate: number };
  ring: { x: number; y: number; w: number; h: number; color: string } | null;
  back: Placed[];
  shadow: { x: number; y: number; w: number; h: number };
  hero: Placed;
  front: Placed[];
}

const TAU = Math.PI * 2;

export interface SceneOptions {
  /** How far a page slides as it leaves, in stage widths: 1 = a whole page, like the phone. */
  drift?: number;
  /** With reduced motion, how quickly a leaving page fades: 1 = over the whole turn, 2 = gone halfway. */
  fade?: number;
}

/**
 * Page k's picture when the pages stand at `pos` (0..2), on a stage of w × h px, at loop time t (0..1 over 8 s).
 * Layers slide faster than the page itself (glow 0.25, hero 0.15, floaters 0.45 × depth, orbit 0.6) for depth.
 * With reduced motion the pages cross-fade in place and nothing drifts.
 */
export function scene(k: number, pos: number, w: number, h: number, t: number, reduced = false, opts: SceneOptions = {}): SceneView {
  const page = PAGES[k];
  const delta = k - pos;
  // How far this page has slid, in stage widths (positions only; fading still follows the whole turn).
  const m = delta * (opts.drift ?? 1);
  const par = reduced ? 0 : 1;
  const shift = reduced ? 0 : m * w;
  const heroSize = Math.min(w * 0.46, h * 0.5, 340);
  const cx = w / 2;
  const cy = h * 0.52;
  const kz = Math.min(1.7, Math.max(0.75, h / 420)); // floaters grow on tall stages
  const bob = reduced ? 0 : Math.sin(t * TAU) * 8;

  const back: Placed[] = [];
  const front: Placed[] = [];
  let ring: SceneView['ring'] = null;

  if (page.orbit) {
    const n = page.floaters.length;
    const rx = Math.min(w * 0.4, heroSize * 1.25);
    const ry = Math.min(h * 0.4, heroSize * 1.05);
    ring = { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2, color: mix(page.accent, page.accent, 0, 0.35) };
    page.floaters.forEach((f, i) => {
      const a = (i * TAU) / n + (reduced ? 0 : t * TAU * 0.5);
      const isFront = Math.sin(a) > 0;
      const s = f.size * kz * (isFront ? 1.15 : 0.85);
      back.push({
        icon: f.icon,
        x: cx + Math.cos(a) * rx - s / 2 + m * w * 0.6 * par,
        y: cy + Math.sin(a) * ry - s / 2,
        size: s,
        rotate: 0,
        opacity: isFront ? 1 : 0.75,
      });
    });
  } else {
    for (const f of page.floaters) {
      const depth = f.depth ?? 1;
      const phase = f.phase ?? 0;
      const fb = reduced ? 0 : Math.sin(t * TAU * 2 + phase) * 10 * depth;
      const s = f.size * kz;
      back.push({
        icon: f.icon,
        x: f.x * w - s / 2 + m * w * 0.45 * depth * par,
        y: f.y * h - s / 2 + fb,
        size: s,
        rotate: reduced ? 0 : Math.sin(t * TAU + phase) * 0.15,
        opacity: 1,
      });
    }
  }

  return {
    k,
    shift,
    opacity: reduced ? Math.max(0, 1 - Math.abs(delta) * (opts.fade ?? 1)) : Math.abs(delta) < 1.2 ? 1 : 0,
    glow: { x: cx - heroSize * 1.05 + m * w * 0.25 * par, y: cy - heroSize * 1.05, size: heroSize * 2.1, color: page.glow },
    burst: { x: cx - heroSize * 0.95, y: cy - heroSize * 0.95, size: heroSize * 1.9, rotate: reduced ? 0 : (t * TAU) / 4 },
    ring,
    back,
    shadow: { x: cx - heroSize * 0.42 + m * w * 0.15 * par, y: cy + heroSize * 0.48, w: heroSize * 0.84 * (1 - bob / 80), h: heroSize * 0.12 },
    hero: {
      icon: page.hero,
      x: cx - heroSize / 2 + m * w * 0.15 * par,
      y: cy - heroSize / 2 + bob - 8,
      size: heroSize,
      rotate: reduced ? 0 : Math.sin(t * TAU) * 0.06,
      opacity: 1,
    },
    front,
  };
}

// ---------- wide screens: the white card trades sides ----------

/** The white card is at least 400 px and 1/2.35 (about 43%) of the screen, as in the old two-column split. */
export const CARD_MIN = 400;
const CARD_RATIO = 2.35;
/** While the card sweeps across, the pictures drift a third of their side in the same direction as a drag. */
export const DRIFT = 0.32;

export interface CardView {
  width: number;
  /** Left edge of the card, in px from the left of the screen. */
  x: number;
  opacity: number;
  /** How far the card travels between the sides (= the width the pictures get). */
  travel: number;
}

/**
 * The white card on wide screens: on the right on pages 1 and 3, on the left on page 2, gliding across
 * as the pages turn (and following a drag). With reduced motion it fades out and comes back on the other side.
 */
export function cardAt(pos: number, w: number, reduced = false): CardView {
  const width = Math.min(w, Math.round(Math.max(CARD_MIN, w / CARD_RATIO)));
  const travel = w - width;
  const p = Math.min(PAGES.length - 1, Math.max(0, pos));
  if (reduced) {
    const onLeft = Math.round(p) % 2;
    return { width, travel, x: travel * (1 - onLeft), opacity: Math.min(1, Math.abs(p - Math.floor(p) - 0.5) * 2) };
  }
  const leftness = 1 - Math.abs(1 - (p % 2)); // 0 on pages 1 and 3, 1 on page 2
  return { width, travel, x: travel * (1 - leftness), opacity: 1 };
}

/** Where page k's pictures sit: beside the card, on the left for pages 1 and 3, on the right for page 2. */
export function artLeft(k: number, card: CardView): number {
  return k % 2 ? card.width : 0;
}

/** Page k's pictures only show on their own side of the card, so the old and new pages never overlap. */
export function sceneClip(k: number, card: CardView, w: number): string {
  return k % 2 ? `inset(0 0 0 ${Math.round(card.x + card.width)}px)` : `inset(0 ${Math.round(w - card.x)}px 0 0)`;
}

// ---------- confetti ----------

export interface Bit {
  x: number;
  y: number;
  rotate: number;
  color: string;
  round: boolean;
}

const BIT_COLORS = ['#F6CC59', '#E9806F', '#8CC7E8', '#FFFFFF', '#B79CF0', '#7FD3A0'];

/** Soft confetti drifting down, the same 28 pieces every time (the phone's ConfettiPainter). */
export function confetti(t: number, w: number, h: number, opacity = 0.8): Bit[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 28 }, (_, i) => {
    const x0 = rand();
    const speed = 0.4 + rand() * 0.8;
    const y0 = rand();
    const a = opacity * (0.45 + rand() * 0.4);
    const y = ((y0 + t * speed) % 1) * (h + 40) - 20;
    const x = x0 * w + Math.sin(t * TAU * speed + i) * 14;
    const c = BIT_COLORS[i % BIT_COLORS.length];
    return { x, y, rotate: t * TAU * speed * 2 + i, color: mix(c, c, 0, a), round: i % 3 === 0 };
  });
}

/** The phone's sunburst: 18 thin rays as one path, centred in a 100 × 100 box. */
export const SUNBURST_PATH = (() => {
  const rays = 18;
  let d = '';
  for (let i = 0; i < rays; i++) {
    const a = (i * TAU) / rays;
    const half = (Math.PI / rays) * 0.55;
    const p = (ang: number) => `${(50 + Math.cos(ang) * 50).toFixed(2)},${(50 + Math.sin(ang) * 50).toFixed(2)}`;
    d += `M50,50L${p(a - half)}L${p(a + half)}Z`;
  }
  return d;
})();
