/**
 * The three welcome pages and their motion, ported from the mobile app's onboarding
 * (lib/screens/intro.dart: _pages, _BottomCard) so the web moves the same. The pictures are the web's own:
 * a laptop and the Android phone with the real portal and child app on their screens (welcome-devices.ts).
 * Pure functions: the component only renders what these return.
 */

export type Lang = 'en' | 'fil';
type Pair = readonly [en: string, fil: string];

export interface WelcomePage {
  bg: readonly [top: string, bottom: string];
  accent: string;
  /** The soft light behind the devices. */
  glow: string;
  title: Pair;
  body: Pair;
}

/** Same colours and story beats as the phone; the words speak to teachers. */
export const PAGES: WelcomePage[] = [
  {
    bg: ['#FFD66B', '#FFF4D6'],
    accent: '#146B60',
    glow: '#FFF0B3',
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
    title: ['Make a lesson in minutes', 'Gumawa ng aralin sa loob ng ilang minuto'],
    body: [
      'Upload a lesson file or type a short story, add a picture and read each page aloud. Lessons follow each child’s reading level.',
      'Mag-upload ng file ng aralin o mag-type ng maikling kuwento, maglagay ng larawan, at basahin nang malakas ang bawat pahina. Sumusunod ang bawat aralin sa antas ng pagbasa ng bata.',
    ],
  },
  {
    bg: ['#9FDDB4', '#E1F1DD'],
    accent: '#0F544B',
    glow: '#E9F8EA',
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

const TAU = Math.PI * 2;

// ---------- wide screens: the white card trades sides ----------

/** The white card is at least 400 px and 1/2.35 (about 43%) of the screen, as in the old two-column split. */
export const CARD_MIN = 400;
const CARD_RATIO = 2.35;

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

// ---------- "Get started": the page turns into the sign-in page ----------

export interface MorphTargets {
  /** Width of the sign-in page's green panel (all of it on phones, where it is a header). */
  panel: number;
  /** Where the white card ends up: its left edge and width (wide), or its top (phones). */
  card: { x: number; width: number; top: number };
  /** The sign-in form's card, which the "Get started" pill grows into. */
  form: { x: number; y: number; w: number; h: number };
  /** The logo at the top of the green panel. */
  logo: { x: number; y: number; height: number };
}

/**
 * Where things stand on the sign-in page (sign-in.ts and brand-panel.ts), so the last welcome page can turn into it.
 * Wide screens: green panel 5/12 on the left (logo at 40, 28, 60 px tall), the form card (440 px, about 562 tall)
 * centred in the white part with the note under it. Phones: a green header about 262 px tall (300 on the
 * narrowest, where the quote takes three lines), the form card 20 px in from the sides, 32 px under it.
 * The handover to the real page settles any small difference.
 */
export function morphTargets(w: number, h: number, wide: boolean): MorphTargets {
  if (wide) {
    const panel = (w * 5) / 12;
    const formW = Math.min(440, w - panel - 40);
    const formH = 562;
    return {
      panel,
      card: { x: panel, width: w - panel, top: 0 },
      form: { x: panel + (w - panel - formW) / 2, y: Math.max(32, (h - formH - 56) / 2), w: formW, h: formH },
      logo: { x: 40, y: 28, height: 60 },
    };
  }
  const head = w < 360 ? 300 : 262;
  const formW = Math.min(440, w - 40);
  return {
    panel: w,
    card: { x: 0, width: w, top: head },
    form: { x: (w - formW) / 2, y: head + 32, w: formW, h: 560 },
    logo: { x: 20, y: 18, height: 60 },
  };
}
