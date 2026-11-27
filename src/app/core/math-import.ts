/**
 * Reads AHA's Math lesson PDFs ("Eskwelang Pamilya", Math for Key Stage 1) into lesson pages the phone can show.
 *
 * The file is a two-column table: the section names on the left (Gawain Checklist, Magic Word, Bata Break,
 * Kwentalakayan, #OOTD, Pabaong Ensayo, Hugot of the Day) and the content on the right. Bullets, steps, number
 * lists and worked examples become their own blocks; every numbered activity becomes a set whose answers come
 * from its "Key to Correction". Classroom-only lines (timers, "Time's Up!", the self-scoring note) are left out,
 * and the answers are double-checked by turning numbers into words and back.
 *
 * Pure functions with no browser APIs and no value imports: pdf-text.ts reads the PDF with pdf.js, and the
 * same code runs in tests (with made-up text in the same layout).
 */
import type { AnswerType, Block, LessonPage, PairItem, SetItem, StepItem, TermItem } from './models';

/** One piece of text as pdf.js gives it, with its position on the page (PDF points, y up). */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Marker = '' | 'check' | 'bullet' | 'step' | 'arrow' | 'heading' | 'icon';

/** One line of the table: the section-name column on the left and the content on the right. */
export interface Row {
  page: number;
  y: number;
  h: number;
  /** Text in the left (section name) column, if any. */
  label: string;
  /** Left edge of the first content word (to tell a wrapped answer line from a new paragraph). */
  x: number;
  marker: Marker;
  text: string;
}

export const SECTIONS = ['Gawain Checklist', 'Magic Word', 'Bata Break', 'Kwentalakayan', '#OOTD', 'Pabaong Ensayo', 'Hugot of the Day'] as const;
export type SectionName = (typeof SECTIONS)[number];

/** The phone lessons one file becomes: short parts that follow AHA's routine. */
const PARTS: { name: string; sections: SectionName[] }[] = [
  { name: 'Magic Word at Bata Break', sections: ['Gawain Checklist', 'Magic Word', 'Bata Break'] },
  { name: 'Kwentalakayan', sections: ['Kwentalakayan'] },
  { name: '#OOTD: Output of the Day', sections: ['#OOTD'] },
  { name: 'Pabaong Ensayo', sections: ['Pabaong Ensayo', 'Hugot of the Day'] },
];

export interface MathPart {
  name: string;
  title: string;
  pages: LessonPage[];
  questions: number;
}

export interface MathSection {
  name: SectionName;
  found: boolean;
  pages: number;
  questions: number;
  answered: number;
}

export interface MathLesson {
  /** "Number Form" */
  title: string;
  /** "Lesson 01" → 1 */
  lessonNo?: number;
  /** "Math for Key Stage 1 (Grades 1–3)" */
  label: string;
  /** The checklist at the top: the parts of the lesson, in order. */
  route: string[];
  sections: MathSection[];
  parts: MathPart[];
  questions: number;
  answered: number;
  /** Answers the portal could check by itself (numbers ↔ words) and found right. */
  verified: number;
  /** Things the teacher should know or check. */
  warnings: string[];
  /** Classroom-only lines left out (timers, "Time's Up!", self-scoring). */
  leftOut: string[];
}

// ------------------------------------------------------------------ text clean-up

/** Icons, emoji, decorative arrows and bullets, private-use icon-font glyphs and the invisible box characters. */
const ICON_CHARS =
  /[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2500}-\u{25FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{2022}\u{2023}\u{2043}\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

const MARKERS: [RegExp, Marker][] = [
  [/^\u0000/, 'check'],
  [/^[◘•▪■●◦\u{1F4A0}\u{1F539}\u{1F538}◆◇]/u, 'bullet'],
  [/^[‣▸►▶]/u, 'step'],
  [/^[➡→⇒➔➤]/u, 'arrow'],
  [/^\u{1F530}/u, 'heading'],
];

const clean = (s: string) => s.replace(ICON_CHARS, ' ').replace(/\s+/g, ' ').trim();
const isIconOnly = (s: string) => s.trim().length > 0 && clean(s) === '';

/** Lower case, one space, hyphens without spaces: "Twenty - Eight" and "twenty-eight" compare equal. */
export function loose(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/[“”"’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.:;,!?]+$/, '')
    .trim();
}

const SECTION_RE: [RegExp, SectionName][] = [
  [/^(gawain|checklist|gawain checklist)$/i, 'Gawain Checklist'],
  [/^magic words?$/i, 'Magic Word'],
  [/^bata break$/i, 'Bata Break'],
  [/^kwentalakayan$/i, 'Kwentalakayan'],
  [/^#?\s*ootd( ?: ?output of the day)?$/i, '#OOTD'],
  [/^pabaong ensayo$/i, 'Pabaong Ensayo'],
  [/^hugot( of the day)?$/i, 'Hugot of the Day'],
];

export function sectionOf(label: string): SectionName | null {
  const t = clean(label);
  for (const [re, name] of SECTION_RE) if (re.test(t)) return name;
  return null;
}

// ------------------------------------------------------------------ rows from the PDF text

/**
 * Builds the table rows from pdf.js text items, page by page. Returns no rows when the file does not look like
 * the Math lesson table (fewer than three section names in a left column).
 */
export function rowsFromPages(pages: TextItem[][]): Row[] {
  const labelItems = pages.flat().filter((it) => sectionOf(it.str));
  const found = new Set(labelItems.map((it) => sectionOf(it.str)));
  if (found.size < 3) return [];
  // The section column ends just after its widest name; the content starts to the right of it.
  const labelX = Math.min(...labelItems.map((it) => it.x));
  const splitX = Math.max(...labelItems.filter((it) => it.x < labelX + 20).map((it) => it.x + it.w)) + 2;

  const rows: Row[] = [];
  pages.forEach((items, p) => {
    const groups: { y: number; items: TextItem[] }[] = [];
    for (const it of items) {
      if (!it.str || !it.str.replace(/\s/g, '')) continue;
      const g = groups.find((r) => Math.abs(r.y - it.y) < 2.5);
      if (g) g.items.push(it);
      else groups.push({ y: it.y, items: [it] });
    }
    groups.sort((a, b) => b.y - a.y);
    for (const g of groups) {
      g.items.sort((a, b) => a.x - b.x);
      const left = g.items.filter((it) => it.x < splitX);
      const right = g.items.filter((it) => it.x >= splitX);
      let marker: Marker = '';
      const parts: TextItem[] = [];
      for (const it of right) {
        if (!parts.length && !marker && isIconOnly(it.str)) {
          marker = markerOf(it.str);
          continue;
        }
        parts.push(it);
      }
      if (parts.length && !marker) {
        const m = markerOf(parts[0].str);
        if (m === 'check') marker = 'check';
      }
      let text = '';
      parts.forEach((it, i) => {
        const gap = i === 0 ? 0 : it.x - (parts[i - 1].x + parts[i - 1].w);
        text += (i > 0 && gap > 1 && !text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
      });
      rows.push({
        page: p + 1,
        y: g.y,
        h: Math.max(...g.items.map((it) => it.h)),
        label: clean(left.map((it) => it.str).join(' ')),
        x: parts[0]?.x ?? 0,
        marker,
        text: clean(text),
      });
    }
  });
  return rows;
}

function markerOf(s: string): Marker {
  const t = s.trimStart();
  for (const [re, m] of MARKERS) if (re.test(t)) return m;
  return 'icon';
}

// ------------------------------------------------------------------ lines: rows joined, footers dropped

interface Line {
  section: SectionName | null;
  text: string;
  marker: Marker;
  x: number;
  /** A blank line (or a new page) comes before this line: a new paragraph. */
  gap: boolean;
}

const NUMBERED = /^(\d{1,2})[.)]\s+(.+)$/;
const PAIR = /^(\d{1,4})\s+[-–—]\s+(\S.*)$/;
const TERMINAL = /[.!?:)"”]$/;

function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

function toLines(rows: Row[]): { header: string[]; footer: string[]; lines: Line[] } {
  const content = rows.filter((r) => r.text || r.label);
  const body = mostCommon(content.filter((r) => r.text).map((r) => Math.round(r.h)));
  // Running footers: small print, or the same words at the same height on two or more pages.
  const seen = new Map<string, Set<number>>();
  for (const r of content) {
    const k = `${Math.round(r.y)}|${r.label}|${r.text}`;
    (seen.get(k) ?? seen.set(k, new Set()).get(k)!).add(r.page);
  }
  const footer = new Set<string>();
  const kept = content.filter((r) => {
    const repeated = (seen.get(`${Math.round(r.y)}|${r.label}|${r.text}`)?.size ?? 0) > 1;
    const small = Math.round(r.h) < body * 0.85;
    if (repeated || small) {
      if (r.text || r.label) footer.add(r.text || r.label);
      return false;
    }
    return true;
  });

  const firstLabel = kept.findIndex((r) => sectionOf(r.label));
  const header = kept.slice(0, Math.max(0, firstLabel)).map((r) => [r.label, r.text].filter(Boolean).join(' '));
  const gaps = kept.slice(1).map((r, i) => (r.page === kept[i].page ? Math.round(kept[i].y - r.y) : 0)).filter((g) => g > 0);
  const step = mostCommon(gaps) || 12;

  const lines: Line[] = [];
  let section: SectionName | null = null;
  let prev: Row | null = null;
  for (const r of kept.slice(Math.max(0, firstLabel))) {
    const s = sectionOf(r.label);
    if (s) section = s;
    // A row with only a section name (the second line of "Gawain / Checklist") does not count for spacing.
    if (!r.text) continue;
    let gap = true;
    if (prev && prev.page === r.page) gap = prev.y - r.y > step * 1.5 || !!s;
    else if (prev && lines.length) gap = TERMINAL.test(lines[lines.length - 1].text) || !/^[a-z]/.test(r.text) || !!s;
    const last = lines[lines.length - 1];
    // An answer that wraps onto the next line ("…(or five hundred and" / "thirty-eight)") is one item.
    if (last && !gap && !r.marker && NUMBERED.test(last.text) && !NUMBERED.test(r.text) && r.x > last.x + 8 && last.section === section) {
      last.text = `${last.text} ${r.text}`;
      prev = r;
      continue;
    }
    lines.push({ section, text: r.text, marker: r.marker, x: r.x, gap });
    prev = r;
  }
  return { header, footer: [...footer], lines };
}

// ------------------------------------------------------------------ numbers and words

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 538 → "five hundred and thirty-eight" (0 to 9999). */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred` + (n % 100 ? ` and ${numberToWords(n % 100)}` : '');
  return `${ONES[Math.floor(n / 1000)]} thousand` + (n % 1000 ? `${n % 1000 < 100 ? ' and' : ''} ${numberToWords(n % 1000)}` : '');
}

/** "Five Hundred and Sixty" → 560; "Thirty-five Pesos" → 35. Null when the words are not a number. */
export function wordsToNumber(text: string): number | null {
  const words = loose(text).replace(/-/g, ' ').split(' ');
  let total = 0;
  let current = 0;
  let any = false;
  for (const w of words) {
    const o = ONES.indexOf(w);
    const t = TENS.indexOf(w);
    if (o >= 0) current += o;
    else if (t >= 2) current += t * 10;
    else if (w === 'hundred') current = (current || 1) * 100;
    else if (w === 'thousand') {
      total += (current || 1) * 1000;
      current = 0;
    } else if (w === 'and' || w === '') continue;
    else if (any) break; // "Pesos", "ang", … after the number
    else continue;
    any = true;
  }
  return any ? total + current : null;
}

/** "P 35.00", "₱35", "35" → "35". Empty when it is not a number. */
export function normalNumber(text: string): string {
  const t = text.replace(/[₱,\s]/g, '').replace(/^(php|p)/i, '');
  const m = /^(\d+)(?:\.0+)?$/.exec(t);
  return m ? String(Number(m[1])) : '';
}

/** Words compared the way the phone checks them: capitals, spaces around hyphens and "and" don't count. */
export function normalWords(text: string): string {
  return loose(text)
    .replace(/[^a-zñ0-9'\- ]/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------------ the sections

const CLASSROOM = [/\bminuto\b/i, /^time.?s up!?$/i, /^ilan ang nakuha/i, /good job/i, /^alamin natin ngayon kung tama/i];
const KEY = /^key to corrections?:?$/i;
const PRAISE = /^(mahusay|magaling|very good|great job)!*$/i;

interface Draft {
  blocks: Block[];
  leftOut: string[];
  warnings: string[];
}

function parseSection(name: SectionName, lines: Line[]): Draft {
  const blocks: Block[] = [];
  const leftOut: string[] = [];
  const warnings: string[] = [];
  const sets: Extract<Block, { type: 'set' }>[] = [];
  let skipping = false;
  let keyMode = false;
  let keySet: Extract<Block, { type: 'set' }> | null = null;
  let set: Extract<Block, { type: 'set' }> | null = null;
  let pendingTitle: string | undefined;
  let examplesNext = false;
  let list: Block | null = null;

  const lastText = () => {
    const b = blocks[blocks.length - 1];
    return b?.type === 'text' ? b : null;
  };
  const endList = () => {
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.text;
    if (line.gap) skipping = false;
    if (skipping) {
      leftOut.push(t);
      continue;
    }
    if (CLASSROOM.some((re) => re.test(t))) {
      // The whole paragraph is for the classroom ("Ilan ang nakuha… GOOD JOB!… sa pagsasagot nito.").
      leftOut.push(t);
      skipping = !/^time.?s up!?$/i.test(t);
      continue;
    }
    if (KEY.test(t)) {
      keyMode = true;
      keySet = null;
      set = null;
      endList();
      continue;
    }
    if (keyMode) {
      if (PRAISE.test(t)) {
        for (const s of sets) s.praise ??= t.replace(/!*$/, '!');
        continue;
      }
      const echo = sets.find((s) => loose(s.instruction) === loose(t));
      if (echo) {
        keySet = echo;
        continue;
      }
      const m = NUMBERED.exec(t);
      if (m) {
        keySet ??= sets.find((s) => s.items.some((it) => !it.answer)) ?? sets[sets.length - 1] ?? null;
        if (!keySet) continue;
        const n = Number(m[1]);
        const item = keySet.items.find((it) => it.n === n);
        if (!item) {
          warnings.push(`${keySet.title}: the key has an answer for item ${n}, but there is no item ${n}.`);
          continue;
        }
        const { answer, accept } = keyAnswer(item.prompt, m[2]);
        item.answer = answer;
        if (accept.length) item.accept = accept;
        if (keySet.items.every((it) => it.answer) && line.gap) keySet = null;
        continue;
      }
      if (line.gap && !line.marker) {
        // The key is over; this is lesson text again.
        keyMode = false;
      } else continue;
    }

    const numbered = NUMBERED.exec(t);
    const next = lines[i + 1];
    // An instruction: ends with ":" and numbered items follow ("Write the word form of the ff. numbers:").
    if (/:$/.test(t) && next && NUMBERED.test(next.text) && !examplesNext) {
      endList();
      set = { type: 'set', title: name, instruction: t, answer: 'words', items: [] };
      sets.push(set);
      blocks.push(set);
      continue;
    }
    if (numbered && set) {
      set.items.push({ n: Number(numbered[1]), prompt: numbered[2].trim(), answer: '' });
      continue;
    }
    if (set && !numbered) set = null;

    if (/^examples?:?$/i.test(t)) {
      endList();
      pendingTitle = t.replace(/:$/, '');
      pendingTitle = pendingTitle[0] + pendingTitle.slice(1).toLowerCase();
      examplesNext = true;
      continue;
    }
    const pair = PAIR.exec(t);
    if (pair && (name === 'Kwentalakayan' || pendingTitle || examplesNext)) {
      const item: PairItem = { n: pair[1], word: pair[2].replace(/\s*[-–—]\s*/g, '-').trim() };
      const type = examplesNext ? 'examples' : 'numbers';
      if (!list || list.type !== type) {
        const made: Block = type === 'examples' ? { type: 'examples', title: pendingTitle, items: [] } : { type: 'numbers', title: pendingTitle, items: [] };
        list = made;
        blocks.push(made);
        pendingTitle = undefined;
      }
      (list as Extract<Block, { type: 'numbers' | 'examples' }>).items.push(item);
      continue;
    }

    if (line.marker === 'heading') {
      endList();
      examplesNext = false;
      pendingTitle = t.replace(/:$/, '');
      continue;
    }
    if (line.marker === 'check') {
      if (!list || list.type !== 'route') {
        list = { type: 'route', items: [] };
        blocks.push(list);
      }
      (list as Extract<Block, { type: 'route' }>).items.push(t);
      continue;
    }
    if (line.marker === 'bullet') {
      const parts = t.split(/\s+[-–—]\s+/);
      if (name === 'Magic Word' && parts.length >= 2) {
        if (!list || list.type !== 'terms') {
          list = { type: 'terms', items: [] };
          blocks.push(list);
        }
        const term: TermItem = { term: parts[0].trim(), meaning: parts.slice(1).join(' - ').trim() };
        (list as Extract<Block, { type: 'terms' }>).items.push(term);
      } else {
        if (!list || list.type !== 'bullets') {
          list = { type: 'bullets', title: pendingTitle, items: [] };
          blocks.push(list);
          pendingTitle = undefined;
        }
        (list as Extract<Block, { type: 'bullets' }>).items.push(t);
      }
      continue;
    }
    if (line.marker === 'step') {
      if (!list || list.type !== 'steps') {
        // Steps under a heading copied from the list above ("Word Names for Numbers in Hundreds") get no heading.
        const copied = pendingTitle && blocks.some((b) => 'title' in b && b.title === pendingTitle);
        if (copied) warnings.push(`The steps repeat the heading "${pendingTitle}" of the list above them, so the heading was left off the steps.`);
        list = { type: 'steps', title: copied ? undefined : pendingTitle, items: [] };
        blocks.push(list);
        pendingTitle = undefined;
      }
      (list as Extract<Block, { type: 'steps' }>).items.push({ text: t });
      continue;
    }
    if (line.marker === 'arrow' && list?.type === 'steps') {
      const steps = (list as Extract<Block, { type: 'steps' }>).items;
      steps[steps.length - 1].chips = t.split(/\s*,\s*/).filter(Boolean);
      continue;
    }
    if (list?.type === 'steps' && !line.gap && !line.marker) {
      // A step's second line, often the Filipino version of it.
      const steps = (list as Extract<Block, { type: 'steps' }>).items;
      steps[steps.length - 1].text += ` ${t}`;
      continue;
    }

    // Plain text: one paragraph per blank line.
    endList();
    examplesNext = false;
    const prevText = lastText();
    if (prevText && !line.gap) prevText.text += ` ${t}`;
    else blocks.push({ type: 'text', text: t });
  }

  // Steps: the English line, then its Filipino line underneath.
  for (const b of blocks) if (b.type === 'steps') b.items = b.items.map(splitStep);

  // Encouragement right after the items ("Achiever, nagtitiwala kami…") cheers the child on at the start.
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k];
    if (b.type === 'text' && /^achiever[,!]/i.test(b.text)) {
      const target = sets[0];
      if (target) {
        target.cheer = b.text;
        blocks.splice(k, 1);
        k--;
      }
    }
  }

  // Sets: titles, answer types, and what the key left empty.
  sets.forEach((s, k) => {
    if (sets.length > 1) s.title = `${name} · Part ${String.fromCharCode(65 + k)}`;
    const answered = s.items.filter((it) => it.answer);
    if (answered.length && answered.every((it) => normalNumber(it.answer))) {
      s.answer = 'number';
      for (const it of answered) it.answer = normalNumber(it.answer);
    }
    const missing = s.items.filter((it) => !it.answer).map((it) => it.n);
    if (missing.length) warnings.push(`${s.title}: no answer in the key for item${missing.length > 1 ? 's' : ''} ${missing.join(', ')}.`);
  });
  return { blocks, leftOut, warnings };
}

/** "538 - five hundred thirty-eight (or five hundred and thirty-eight)" → the answer and the other accepted answer. */
export function keyAnswer(prompt: string, raw: string): { answer: string; accept: string[] } {
  const accept: string[] = [];
  let text = raw
    .replace(/\(\s*(?:or|o kaya|o)\s+([^)]+)\)/gi, (_, alt: string) => {
      accept.push(alt.replace(/\s+/g, ' ').trim());
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  // Drop the question when the key repeats it: "26 - twenty-six", "Four - 4", "Jasmine - … Pesos - P 35.00".
  const parts = text.split(/\s+[-–—]\s+/);
  const p = loose(prompt);
  for (let k = parts.length - 1; k > 0; k--) {
    if (loose(parts.slice(0, k).join(' - ')) === p) {
      text = parts.slice(k).join(' - ');
      break;
    }
  }
  return { answer: text.replace(/\s*[-–—]\s*(?=[a-z])/gi, '-').trim(), accept };
}

/** "Write the ones digit. These are your numbers below 10. Isulat ang ones digit…" → English text, Filipino note. */
function splitStep(s: StepItem): StepItem {
  const fil = /\b(isulat|pagsamahin|ito ang|ang mga|sa pagitan|maglagay|mga bilang|ng)\b/i;
  const sentences = s.text.match(/[^.!?:]+[.!?:]+["”’)]?\s*|[^.!?:]+$/g)?.map((x) => x.trim()) ?? [s.text];
  const first = sentences.findIndex((x, k) => k > 0 && fil.test(x) && /^(isulat|pagsamahin|ito|sa |maglagay|ang )/i.test(x));
  if (first <= 0) {
    // "…below 10. Isulat ang" + "ones digit, ito…": the Filipino starts in the middle of a sentence.
    const at = s.text.search(/\s(Isulat|Pagsamahin)\b/);
    if (at > 0) return { ...s, text: s.text.slice(0, at).trim(), note: s.text.slice(at).trim() };
    return s;
  }
  return { ...s, text: sentences.slice(0, first).join(' '), note: sentences.slice(first).join(' ') };
}

// ------------------------------------------------------------------ checking the key

function verify(set: Extract<Block, { type: 'set' }>, warnings: string[]): number {
  let ok = 0;
  for (const it of set.items) {
    if (!it.answer) continue;
    const promptNumber = normalNumber(it.prompt);
    if (set.answer === 'words' && promptNumber) {
      const expected = normalWords(numberToWords(Number(promptNumber)));
      const given = [it.answer, ...(it.accept ?? [])].map(normalWords);
      if (given.includes(expected)) ok++;
      else warnings.push(`${set.title}, item ${it.n}: the key says "${it.answer}" for ${it.prompt}. Please check it.`);
    } else if (set.answer === 'number') {
      const value = wordsToNumber(it.prompt.split(/\s+[-–—]\s+/).pop() ?? it.prompt);
      if (value === null) continue;
      if (String(value) === it.answer) ok++;
      else warnings.push(`${set.title}, item ${it.n}: the key says ${it.answer} for "${it.prompt}". Please check it.`);
    }
  }
  return ok;
}

// ------------------------------------------------------------------ pages

function blockText(b: Block): string {
  switch (b.type) {
    case 'text':
      return b.text;
    case 'route':
      return b.items.join('. ');
    case 'terms':
      return b.items.map((t) => `${t.term}: ${t.meaning}`).join(' ');
    case 'bullets':
      return [b.title, ...b.items].filter(Boolean).join('. ');
    case 'steps':
      return [b.title, ...b.items.map((s, i) => `${i + 1}. ${s.text}${s.note ? ` ${s.note}` : ''}`)].filter(Boolean).join(' ');
    case 'numbers':
    case 'examples':
      return [b.title, ...b.items.map((p) => `${p.n}, ${p.word}`)].filter(Boolean).join('. ');
    case 'set':
      return b.instruction;
  }
}

/** Pages short enough for big letters on a phone: one list per page, long paragraphs on their own page. */
function toPages(section: SectionName, blocks: Block[], makeId: (p: string) => string): LessonPage[] {
  const pages: Block[][] = [];
  let page: Block[] = [];
  const size = (bs: Block[]) => bs.reduce((s, b) => s + blockText(b).length, 0);
  const flush = () => {
    if (page.length) pages.push(page);
    page = [];
  };
  for (const b of blocks) {
    if (b.type === 'set') {
      flush();
      pages.push([b]);
      continue;
    }
    if (b.type === 'text') {
      const len = b.text.length;
      const hasList = page.some((x) => x.type !== 'text');
      if ((hasList && len > 120) || size(page) + len > 220) flush();
      page.push(b);
      if (len > 160) flush();
      continue;
    }
    // A list starts its own page, taking its short lead-in lines with it ("Ito ay ang mga:", "Basta laging tandaan:").
    const lead: Block[] = [];
    while (page.length && page[page.length - 1].type === 'text' && size([...lead, page[page.length - 1]]) <= 120) lead.unshift(page.pop()!);
    flush();
    page.push(...lead, b);
  }
  flush();
  return pages.map((bs) => ({ id: makeId('pg'), section, text: bs.map(blockText).join('\n'), blocks: bs }));
}

const defaultId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 24);

/** Title case for the label: "MATH FOR KEY STAGE 1 (GRADES 1 - 3)" → "Math for Key Stage 1 (Grades 1–3)". */
function niceLabel(s: string): string {
  const small = new Set(['for', 'of', 'and', 'the', 'to', 'in']);
  const t = s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : s;
  return t
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(' ')
    .replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

/** True when the PDF looks like AHA's Math lesson table. */
export function isMathLesson(pages: TextItem[][]): boolean {
  return rowsFromPages(pages).length > 0;
}

/** Reads the whole lesson. Null when the file is not in the Math lesson layout. */
export function parseMathLesson(pages: TextItem[][], makeId: (prefix: string) => string = defaultId): MathLesson | null {
  const rows = rowsFromPages(pages);
  if (!rows.length) return null;
  const { header, footer, lines } = toLines(rows);

  let title = '';
  let lessonNo: number | undefined;
  let label = '';
  for (const h of header) {
    const m = /^lesson\s*0*(\d+)\s*[:.\-–]\s*(.+)$/i.exec(h);
    if (m) {
      lessonNo = Number(m[1]);
      title = m[2].trim();
    } else if (!label && /math|grade|key stage/i.test(h)) label = niceLabel(h);
    else if (!title) title = h;
  }

  const warnings: string[] = [];
  const leftOut: string[] = [];
  const route: string[] = [];
  const bySection = new Map<SectionName, Block[]>();
  for (const name of SECTIONS) {
    const own = lines.filter((l) => l.section === name);
    if (!own.length) continue;
    const d = parseSection(name, own);
    bySection.set(name, d.blocks);
    warnings.push(...d.warnings);
    leftOut.push(...d.leftOut);
    for (const b of d.blocks) if (b.type === 'route') route.push(...b.items);
  }

  // Checks across the whole file.
  for (const r of route) {
    const s = sectionOf(r.replace(/:.*$/, ''));
    if (s && !bySection.has(s)) warnings.push(`"${s}" is in the checklist, but the file has no ${s} section. Add it in the editor, or remove it from the checklist.`);
  }
  const titles = new Map<string, number>();
  for (const blocks of bySection.values()) {
    for (const b of blocks) {
      if ((b.type === 'numbers' || b.type === 'steps' || b.type === 'bullets' || b.type === 'examples') && b.title) {
        titles.set(b.title, (titles.get(b.title) ?? 0) + 1);
      }
    }
  }
  for (const [t, n] of titles) if (n > 1) warnings.push(`${n} lists have the same heading "${t}". Check that each heading fits its list.`);
  const otherSubject = footer.find((f) => /reading|pagbasa|english|filipino/i.test(f) && !/math/i.test(f));
  if (otherSubject && /math/i.test(label)) warnings.push(`The footer says "${otherSubject}". The title "${label}" was used instead.`);

  let questions = 0;
  let answered = 0;
  let verified = 0;
  const sections: MathSection[] = [];
  const pagesBySection = new Map<SectionName, LessonPage[]>();
  for (const name of SECTIONS) {
    const blocks = bySection.get(name);
    if (!blocks) {
      sections.push({ name, found: false, pages: 0, questions: 0, answered: 0 });
      continue;
    }
    const sets = blocks.filter((b): b is Extract<Block, { type: 'set' }> => b.type === 'set');
    const q = sets.reduce((s, b) => s + b.items.length, 0);
    const a = sets.reduce((s, b) => s + b.items.filter((it) => it.answer).length, 0);
    for (const s of sets) verified += verify(s, warnings);
    questions += q;
    answered += a;
    const pages = toPages(name, blocks, makeId);
    pagesBySection.set(name, pages);
    sections.push({ name, found: true, pages: pages.length, questions: q, answered: a });
  }

  const parts: MathPart[] = [];
  for (const part of PARTS) {
    const pages = part.sections.flatMap((s) => pagesBySection.get(s) ?? []);
    if (!pages.length) continue;
    const q = pages.flatMap((p) => p.blocks ?? []).reduce((s, b) => s + (b.type === 'set' ? b.items.length : 0), 0);
    parts.push({ name: part.name, title: `${title || 'Math'} · ${part.name}`, pages, questions: q });
  }
  if (leftOut.length) warnings.push(`${leftOut.length} classroom line${leftOut.length === 1 ? '' : 's'} left out (timers, "Time's Up!", self-scoring): the phone has no timers and checks the answers itself.`);

  return { title, lessonNo, label, route, sections, parts, questions, answered, verified, warnings, leftOut };
}

/** The plain words of a page built from blocks (the page's text: for checks, search and the computer voice). */
export function blocksText(blocks: Block[]): string {
  return blocks.map(blockText).join('\n');
}

/**
 * Whether the child's answer is right, the way the phone checks it (keep in step with the app's answer_check.dart):
 * numbers ignore "P"/"₱", commas and ".00"; words ignore capitals, spaces around hyphens and "and".
 */
export function isRightAnswer(type: AnswerType, item: SetItem, given: string): boolean {
  const keys = [item.answer, ...(item.accept ?? [])].filter((k) => k.trim());
  if (type === 'number') {
    const g = normalNumber(given);
    return !!g && keys.some((k) => normalNumber(k) === g);
  }
  const g = normalWords(given);
  return !!g && keys.some((k) => normalWords(k) === g);
}

/**
 * The word tiles for one item: the answer's words plus a few words from the other answers, in a fixed shuffled
 * order (the same every time, on the phone and in the preview).
 */
export function tilesFor(items: SetItem[], index: number): string[] {
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
  const own = words(items[index]?.answer ?? '');
  const ownLoose = new Set(own.map((w) => w.toLowerCase()));
  const pool: string[] = [];
  for (let k = 1; k < items.length; k++) {
    for (const w of words(items[(index + k) % items.length].answer)) {
      if (!ownLoose.has(w.toLowerCase()) && !pool.some((p) => p.toLowerCase() === w.toLowerCase())) pool.push(w);
    }
  }
  const extra = pool.slice(0, Math.max(2, Math.min(4, 7 - own.length)));
  const score = (w: string, i: number) => {
    let h = index * 31 + i * 17;
    for (const c of w) h = (h * 33 + c.charCodeAt(0)) % 1000003;
    return h;
  };
  return [...own, ...extra].map((w, i) => ({ w, s: score(w, i) })).sort((a, b) => a.s - b.s).map((x) => x.w);
}

/** Every answer type a set can use, with what the child does. */
export const ANSWER_TYPES: { key: AnswerType; label: string; hint: string }[] = [
  { key: 'number', label: 'Number pad', hint: 'The child taps the digits' },
  { key: 'words', label: 'Word tiles', hint: 'The child builds the words from tiles' },
  { key: 'choice', label: 'Choices', hint: 'The child picks one of 3 answers' },
];

/** For the review page: every set in the lesson, in order. */
export function setsOf(lesson: MathLesson): Extract<Block, { type: 'set' }>[] {
  return lesson.parts.flatMap((p) => p.pages.flatMap((pg) => (pg.blocks ?? []).filter((b): b is Extract<Block, { type: 'set' }> => b.type === 'set')));
}

export type { SetItem };
