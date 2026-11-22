/**
 * Made-up reading-check history for the SAMPLE learners (never real children), so the portal's
 * dashboard charts have twelve weeks of shape: a one-minute timed reading every week for children who
 * read words or more, a reading-level check every four weeks, and a few level moves up and down.
 *
 * The API server's sample data uses the same rules (src/sample-history.ts in the backend),
 * so both show the same sample school. Keep the two files the same.
 */
export const LEVEL_ORDER = ['Beginner', 'Letter', 'Word', 'Paragraph', 'Story'] as const;

export interface SampleCheck {
  id: string;
  learnerId: string;
  type: 'placement' | 'fluency';
  daysAgo: number;
  level: string;
  previousLevel: string;
  passage?: string;
  wordsTotal?: number;
  missedIndexes?: number[];
  seconds?: number;
  accuracy?: number;
  wcpm?: number;
  note: string;
}

/** The sample passages children read aloud in a timed reading, by level. */
const PASSAGES: Record<string, string> = {
  Word: 'Si Mimi ay pusa. Si Mimi ay puti. Gusto ni Mimi ang isda at gatas.',
  Paragraph:
    'Maaga gumising si Lito. Tumulong siya kay Nanay sa kusina. Nagluto sila ng lugaw para sa buong pamilya. Pagkatapos kumain, naglakad si Lito papunta sa paaralan kasama ang kaibigan niya.',
  Story:
    'Isang umaga, umulan nang malakas sa aming barangay. Hindi makapasok si Ana sa paaralan dahil baha sa kalsada. Binuksan niya ang telepono ni Nanay at pinakinggan ang aralin ni Teacher Ana. Natuto siyang bumasa ng bagong kuwento tungkol sa isang matapang na pagong. Nang humupa ang ulan, ikinuwento niya ito sa mga kapatid niya.',
};

/** Words correct per minute a sample child reaches by today, by their current level. */
const SPEED_TODAY: Record<string, number> = { Word: 27, Paragraph: 45, Story: 64 };

const rank = (level: string) => LEVEL_ORDER.indexOf(level as (typeof LEVEL_ORDER)[number]);

/** Small, repeatable random numbers (the same history on every run). */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** The day (counted back from today) of the sample learner's first placement check. */
export const baselineDay = (i: number) => 40 - i;

/** True for the sample learners who still wait for their first check. */
export const neverChecked = (i: number) => i % 5 === 4;

/** An early reader whose last check was more than 30 days ago (so the "needs a check" list is not empty). */
export const overdue = (i: number, level: string) => rank(level) <= 1 && i % 7 === 0 && !neverChecked(i);

/**
 * One level move for some sample learners: either before their first placement check ("early",
 * 44 to 77 days ago) or after it ("late", 3 to 25 days ago), so every child's record stays consistent.
 */
export function sampleMove(i: number, level: string): { from: string; day: number } | null {
  const k = rank(level);
  if (k < 0 || neverChecked(i)) return null;
  const recent = !overdue(i, level);
  const late = (from: number, day: number) => ({ from: LEVEL_ORDER[from], day: Math.min(baselineDay(i) - 4, day) });
  const early = (from: number) => ({ from: LEVEL_ORDER[from], day: Math.max(baselineDay(i) + 4, 44 + ((i * 11) % 34)) });
  if (recent && i % 4 === 1 && k > 0) return late(k - 1, 3 + ((i * 7) % 23)); // moved up recently
  if (recent && i % 5 === 0 && i > 0 && k > 0) return late(k - 1, 3 + ((i * 7) % 23));
  if (recent && i % 6 === 2 && k < 4) return late(k + 1, 8 + ((i * 9) % 17)); // moved down after weeks away
  if (i % 3 === 0 && k > 0) return early(k - 1); // moved up before the first check
  if (i % 4 === 3 && k < 4) return early(k + 1); // moved down before the first check
  return null;
}

/** The level recorded at the sample learner's first placement check. */
export function baselineLevel(i: number, level: string): string {
  const move = sampleMove(i, level);
  return move && move.day < baselineDay(i) ? move.from : level;
}

export function sampleHistory(learners: { id: string; level: string }[]): SampleCheck[] {
  const out: SampleCheck[] = [];
  learners.forEach((l, i) => {
    if (neverChecked(i)) return;
    const move = sampleMove(i, l.level);
    const levelAt = (day: number) => (move && day > move.day ? move.from : l.level);
    const r = rng(i * 7919 + 13);
    const lastDay = overdue(i, l.level) ? 34 : 0;
    const tag = l.id.replace(/^lrn_/, '');
    let n = 0;
    const id = () => `asm_hist_${tag}_${n++}`;

    if (move) {
      const up = rank(l.level) > rank(move.from);
      out.push({
        id: id(),
        learnerId: l.id,
        type: 'placement',
        daysAgo: move.day,
        level: l.level,
        previousLevel: move.from,
        note: up ? 'Moved up a level (sample).' : 'Moved down a level after weeks away (sample).',
      });
    }

    // A reading-level check every four weeks.
    for (let d = 80 - (i % 9); d >= Math.max(lastDay, 1); d -= 28) {
      if (Math.abs(d - baselineDay(i)) < 4 || (move && Math.abs(d - move.day) < 4)) continue;
      const lv = levelAt(d);
      out.push({ id: id(), learnerId: l.id, type: 'placement', daysAgo: d, level: lv, previousLevel: lv, note: 'Reading-level check (sample).' });
    }

    // A one-minute timed reading in each of the last twelve weeks, for children who read words or more.
    // Speed grows about one word a week, with a dip during two weeks of classes suspended by flooding.
    const today = SPEED_TODAY[l.level] ?? SPEED_TODAY['Word'];
    for (let week = 0; week < 12; week++) {
      const d = 7 * (11 - week) + (i % 7);
      if (d < lastDay) continue;
      const lv = levelAt(d);
      if (rank(lv) < 2) continue;
      const dip = d >= 35 && d <= 48 ? 8 : 0;
      const target = Math.max(6, today - 0.95 * (11 - week) + (r() * 6 - 3) - dip);
      const words = PASSAGES[lv].split(/\s+/);
      const missed = Math.max(0, Math.min(words.length - 1, Math.round(words.length * (0.04 + r() * 0.1 + dip / 120))));
      const missedIndexes: number[] = [];
      while (missedIndexes.length < missed) {
        const at = Math.floor(r() * words.length);
        if (!missedIndexes.includes(at)) missedIndexes.push(at);
      }
      missedIndexes.sort((a, b) => a - b);
      const correct = words.length - missed;
      const seconds = Math.max(8, Math.round((correct / target) * 60));
      out.push({
        id: id(),
        learnerId: l.id,
        type: 'fluency',
        daysAgo: d,
        level: lv,
        previousLevel: lv,
        passage: PASSAGES[lv],
        wordsTotal: words.length,
        missedIndexes,
        seconds,
        accuracy: Math.round((correct / words.length) * 100),
        wcpm: Math.round((correct / seconds) * 60),
        note: 'Timed reading (sample).',
      });
    }
  });
  return out;
}
