import { CardView, Lang } from './welcome-motion';

/**
 * The welcome pages' devices: a laptop showing the teacher and admin portal, and the Android phone showing the
 * child's lessons. One stage, three shots: on wide screens the same two devices glide under the card as it trades
 * sides and turn to face the words; only their screens change. On phones they stay put, smaller, above the words.
 * Everything here is plain numbers so it can be tested; welcome-devices.ts draws it.
 */

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
/** 0 → 1 over [a, b]. */
export const span = (t: number, [a, b]: readonly [number, number]) => clamp((t - a) / (b - a));
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x: number) => x * x * x;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutBack = (x: number, s = 1.25) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

// ---------------------------------------------------------------- where the devices stand

export interface DevicePose {
  /** Where the laptop's hinge sits on the stage, in px. */
  cx: number;
  cy: number;
  scale: number;
  /** Turn of the whole set, in degrees: positive faces right (towards a card on the right). */
  yaw: number;
  pitch: number;
  /** +1: the phone stands on the right of the laptop; -1: on the left. In between while gliding. */
  side: number;
  /** The phone, relative to the laptop's hinge (before the set's scale). */
  phone: { x: number; z: number; yaw: number; scale: number };
}

/** How wide the set is at scale 1 (laptop plus the phone beside it) and how tall (lid top to the deck's front). */
export const SET_W = 610;
export const SET_H = 445;
/** Room kept at the top of the phone-size stage for the message card. */
export const NOTE_SPACE = 74;
/** The card's wave reaches this far into the picture side. */
const WAVE = 46;

/**
 * The set's pose when the pages stand at `pos` (0..2) on a stage of w × h px.
 * Wide screens: beside the card (left of it on pages 1 and 3, right of it on page 2), facing the words, gliding
 * under the card between pages. Narrow screens (phones): small, centred, with room for the message card above.
 */
export function devicePose(pos: number, wide: boolean, w: number, h: number, card: CardView, reduced = false): DevicePose {
  const p = clamp(pos, 0, 2);
  const frac = p - Math.floor(p);
  const midway = reduced ? 0 : Math.sin(Math.PI * frac); // 0 at a page, 1 halfway between two
  if (wide) {
    const leftness = reduced ? Math.round(p) % 2 : 1 - Math.abs(1 - (p % 2));
    const side = 1 - 2 * leftness;
    const artCenter = lerp(card.travel / 2, card.width + card.travel / 2, leftness);
    const scale = Math.min(clamp(card.travel / 965, 0.6, 1.1), (h - 150) / 470) * (1 - 0.06 * midway);
    return {
      // The set leans away from the card's wave, and is a little heavier on the laptop's side.
      cx: artCenter - (105 * scale + 22) * side,
      cy: h * 0.5 + 128 * scale,
      scale,
      yaw: 14 * side,
      pitch: -11,
      side,
      phone: { x: lerp(310, -310, leftness), z: 210, yaw: -12 * side, scale: 0.92 },
    };
  }
  // Phones: kept small so the words lead (about two thirds of the width at most), fully in view.
  const scale = Math.max(0.24, Math.min(Math.min(w * 0.66, 380) / SET_W / 1.15, ((h - WAVE - NOTE_SPACE) * 0.62) / SET_H));
  const mid = NOTE_SPACE + (h - WAVE - NOTE_SPACE) / 2;
  return {
    cx: w / 2 - 30 * scale,
    cy: mid + 138 * scale,
    scale: scale * (1 - 0.05 * midway),
    // A small turn as the screens change, then back to facing slightly right.
    yaw: 12 - 22 * midway,
    pitch: -11,
    side: 1,
    phone: { x: 250, z: 220, yaw: -14, scale: 1 },
  };
}

// ---------------------------------------------------------------- what happens on each page

export type LaptopScreen = 'lessons' | 'upload' | 'reading' | 'creating' | 'created' | 'admin';
export type PhoneScreen = 'path' | 'lesson' | 'done';
/** Bottom to top: a later screen covers an earlier one. */
export const LAPTOP_SCREENS: LaptopScreen[] = ['lessons', 'upload', 'reading', 'creating', 'created', 'admin'];
export const PHONE_SCREENS: PhoneScreen[] = ['path', 'lesson', 'done'];

/** The first visit: the laptop opens, its screen wakes, the phone rises in (seconds after the page shows). */
export const OPENING = { lid: [0.15, 1.4] as const, wake: [0.9, 1.35] as const, phone: [0.95, 1.7] as const };
/** Page 1's moment waits for the laptop to open on the first visit. */
export const OPENING_LEAD = 1.75;

/** Seconds after arriving at a page. */
export const MOMENTS = {
  /** Page 1: a lesson lifts off the teacher's Lessons page and lands on the child's path. */
  pocket: { fly: [0.6, 1.9] as const, pulse: [1.85, 2.65] as const, note: 2.0 },
  /** Page 2: a PDF drops into the upload pop-up; the loader reads it; the lesson is ready on the phone. */
  make: { drop: [0.55, 1.3] as const, flash: [1.2, 1.65] as const, reading: 1.45, creating: 2.2, created: 2.95, note: 3.05, phone: 3.15, sound: 3.4 },
  /** Page 3: a star leaves the child's medal and lights up the center's bar on the admin overview. */
  shine: { star: [0.7, 1.6] as const, glow: [1.5, 2.5] as const, note: 1.65 },
};

/** The screen a device shows on page k, t seconds after arriving (Infinity = the end of the moment). */
export function laptopScreen(k: number, t: number): LaptopScreen {
  if (k === 0) return 'lessons';
  if (k === 2) return 'admin';
  const m = MOMENTS.make;
  return t >= m.created ? 'created' : t >= m.creating ? 'creating' : t >= m.reading ? 'reading' : 'upload';
}

export function phoneScreen(k: number, t: number): PhoneScreen {
  if (k === 2) return 'done';
  return k === 1 && t >= MOMENTS.make.phone ? 'lesson' : 'path';
}

/**
 * How much of each screen shows. Within a page the loader's screens fade into each other (0.18 s) and the child's
 * lesson slides up over the path; between pages the old and new screens cross-fade around the halfway point.
 */
export function screenWeights<S extends string>(
  order: readonly S[],
  current: S,
  previous: S | null,
  sinceChange: number,
  fade = 0.18,
): Record<S, number> {
  const w = Object.fromEntries(order.map((s) => [s, 0])) as Record<S, number>;
  const f = previous === null || previous === current ? 1 : clamp(sinceChange / fade);
  if (previous === null || previous === current || f >= 1) {
    w[current] = 1;
    return w;
  }
  // The upper one of the two fades: up when it is coming in, out when it is leaving.
  if (order.indexOf(current) > order.indexOf(previous)) {
    w[previous] = 1;
    w[current] = f;
  } else {
    w[current] = 1;
    w[previous] = 1 - f;
  }
  return w;
}

// ---------------------------------------------------------------- the words on the message cards

export interface NoteText {
  title: string;
  detail: string;
}
type Pair = readonly [string, string];
const t2 = (p: Pair, lang: Lang) => (lang === 'fil' ? p[1] : p[0]);

const NOTES: { title: Pair; detail: Pair }[] = [
  { title: ['Saved on the phone', 'Naka-save sa phone'], detail: ['Bea keeps learning with no load and no signal', 'Tuloy ang aral ni Bea kahit walang load o signal'] },
  { title: ['1 lesson created', '1 aralin ang nagawa'], detail: ['Ang Matalinong Pagong · Filipino', 'Ang Matalinong Pagong · Filipino'] },
  { title: ['Bea moved up a level', 'Umakyat ng antas si Bea'], detail: ['Word → Paragraph · Better World Tondo', 'Salita → Talata · Better World Tondo'] },
];

export function noteText(k: number, lang: Lang): NoteText {
  const n = NOTES[clamp(k, 0, 2)];
  return { title: t2(n.title, lang), detail: t2(n.detail, lang) };
}

export const lessonChip = (lang: Lang) => ({ title: 'Ang Matalinong Pagong', detail: lang === 'fil' ? 'Filipino · Bagong aralin' : 'Filipino · New lesson' });

/** When page k's message card comes in (seconds after arriving). */
export const noteAt = (k: number) => (k === 0 ? MOMENTS.pocket.note : k === 1 ? MOMENTS.make.note : MOMENTS.shine.note);
