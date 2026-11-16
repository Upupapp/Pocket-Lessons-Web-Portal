/**
 * Turns the text of a lesson file (an AHA reading lesson: story, comprehension questions, answer key)
 * into a unit plan: short lessons on one path, practice words, and a checkpoint.
 * Pure functions with no browser APIs, so the same code can move to the backend later.
 */

export interface ImportedQuestion {
  number: number;
  prompt: string;
  choices: string[];
  /** Index into choices, or -1 when the answer key does not cover this question. */
  answer: number;
}

export interface ParsedLesson {
  title: string;
  author: string;
  /** e.g. "Reading for Grades 1-2 · Aralin 1" */
  label: string;
  paragraphs: string[];
  questions: ImportedQuestion[];
  warnings: string[];
}

export interface PlannedLesson {
  title: string;
  paragraphs: string[];
  words: number;
  minutes: number;
  reviewWords: string[];
  practice: { prompt: string; choices: string[]; answer: number }[];
}

export interface UnitPlan {
  lessons: PlannedLesson[];
  checkpoint: { title: string; intro: string; questions: ImportedQuestion[] };
}

const STORY_MARK = /^(story|kuwento|kwento)$/i;
const QUESTIONS_MARK = /^(comprehension questions|questions|mga tanong|tanong)\b/i;
const KEY_MARK = /^(key to corrections?|answer key|susi sa pagwawasto|susi)\b/i;
const QUESTION_LINE = /^(\d{1,2})[.)]\s+(.+)$/;
const OPTION_LINE = /^([A-Da-d])[.)]\s+(.+)$/;
const KEY_LINE = /^(\d{1,2})[.)]?\s*[-:]?\s*\(?([A-Da-d])\)?(?:[\s.)]|$)/;
const LABEL_LINE = /\b(grades?|baitang)\s*\d|^(aralin|lesson)\s*\d+$/i;
const RULE_LINE = /^[-–—_*=\s]{3,}$/;

/** Words that are too common to practise on their own. */
const COMMON = new Set(
  (
    'ang ng sa na at ay mga si ni kay ko mo niya namin natin nila kami tayo sila ako ikaw siya ito iyan iyon ' +
    'hindi oo wala may mayroon din rin lang naman pala nga po opo pero kung kaya dahil para tapos saka ' +
    'sabi niyang kaniyang kanyang kanilang kaniya kanila amin aming iyong inyo ating akin aking atin ' +
    'siyang akong kong nating naming ninyo itong iyang yung sila kamiy tayoy ' +
    'noong ngayon dapat siguro ganito ganiyan ganoon parang habang pagkatapos kahit ano sino paano bakit ' +
    'isang dalawa dalawang tatlo tatlong apat lahat buong buo mas pinaka laging lagi ulit muli ' +
    'the and for with this that from have your'
  ).split(' '),
);

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
export const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Splits text into blocks separated by blank lines; each block keeps its lines. */
function blocks(text: string): string[][] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map(clean).filter(Boolean))
    .filter((b) => b.length);
}

function joinLines(lines: string[]): string {
  return lines.reduce((acc, line) => {
    if (!acc) return line;
    // A word broken at the end of a line ("kapa-" + "tid") joins without a space.
    if (/[a-zà-ÿ]-$/i.test(acc) && /^[a-zà-ÿ]/.test(line)) return acc + line;
    return `${acc} ${line}`;
  }, '');
}

export function parseLessonText(text: string): ParsedLesson {
  const warnings: string[] = [];
  const labelParts: string[] = [];
  let title = '';
  let author = '';
  const paragraphs: string[] = [];
  const questionLines: string[] = [];
  const keyLines: string[] = [];

  type Section = 'head' | 'story' | 'questions' | 'key';
  let section: Section = 'head';
  const all = blocks(text);
  const hasStoryMark = all.some((b) => b.some((l) => STORY_MARK.test(l)));
  if (!hasStoryMark) section = 'story';

  for (const block of all) {
    let storyLines: string[] = [];
    const flushStory = () => {
      if (storyLines.length) paragraphs.push(joinLines(storyLines));
      storyLines = [];
    };
    for (const line of block) {
      if (STORY_MARK.test(line)) { section = 'story'; continue; }
      if (QUESTIONS_MARK.test(line)) { flushStory(); section = 'questions'; continue; }
      if (KEY_MARK.test(line)) { flushStory(); section = 'key'; continue; }
      if (RULE_LINE.test(line)) continue;

      if (section === 'head') {
        if (LABEL_LINE.test(line) && line.length < 60) labelParts.push(line);
        else if (!title && line.length < 70) title = line;
        continue;
      }
      if (section === 'story') {
        if (!title && !paragraphs.length && !storyLines.length && line.length < 70 && !/[.!?]["”’]?$/.test(line)) {
          title = line;
          continue;
        }
        if (!author && !paragraphs.length && !storyLines.length && (/^\(.{2,60}\)$/.test(line) || /^(ni|by|isinulat ni)\s/i.test(line))) {
          author = line.replace(/^\(|\)$/g, '').replace(/^(ni|by|isinulat ni)\s+/i, '').trim();
          continue;
        }
        if (LABEL_LINE.test(line) && line.length < 60 && !paragraphs.length && !storyLines.length) {
          labelParts.push(line);
          continue;
        }
        storyLines.push(line);
        continue;
      }
      if (section === 'questions') questionLines.push(line);
      else if (section === 'key') keyLines.push(line);
    }
    flushStory();
  }

  // Questions: "1. Prompt" lines, then "A) choice" lines; other lines continue the previous item.
  const questions: ImportedQuestion[] = [];
  let lastWasOption = false;
  for (const line of questionLines) {
    const q = QUESTION_LINE.exec(line);
    const o = OPTION_LINE.exec(line);
    if (q && !o) {
      questions.push({ number: +q[1], prompt: clean(q[2]), choices: [], answer: -1 });
      lastWasOption = false;
    } else if (o && questions.length) {
      questions[questions.length - 1].choices.push(clean(o[2]));
      lastWasOption = true;
    } else if (questions.length) {
      const cur = questions[questions.length - 1];
      if (lastWasOption && cur.choices.length) cur.choices[cur.choices.length - 1] = joinLines([cur.choices[cur.choices.length - 1], line]);
      else cur.prompt = joinLines([cur.prompt, line]);
    }
  }

  // Answer key: "1. B (Bibingka)".
  const key = new Map<number, number>();
  for (const line of keyLines) {
    const k = KEY_LINE.exec(line);
    if (k) key.set(+k[1], k[2].toUpperCase().charCodeAt(0) - 65);
  }
  for (const q of questions) {
    const a = key.get(q.number);
    if (a !== undefined && a < q.choices.length) q.answer = a;
  }

  if (!paragraphs.length) warnings.push('No story text was found. Check that the file has a "Story" section, or paste the text instead.');
  if (!title) warnings.push('No story title was found. Type one in before creating the unit.');
  if (!questions.length) warnings.push('No comprehension questions were found. The checkpoint will need questions added by hand.');
  const noKey = questions.filter((q) => q.answer < 0).map((q) => q.number);
  if (noKey.length) warnings.push(`No answer in the key for question ${noKey.join(', ')}. Pick the right choice by hand.`);
  const odd = questions.filter((q) => q.choices.length < 2 || q.choices.length > 4).map((q) => q.number);
  if (odd.length) warnings.push(`Question ${odd.join(', ')} needs 2 to 4 choices.`);
  for (const p of paragraphs) if (p.length > 400) { warnings.push('Some paragraphs are long; they were split into shorter pages.'); break; }

  return { title: toTitle(title), author, label: labelParts.map(toTitle).join(' · '), paragraphs: paragraphs.flatMap(splitLong), questions, warnings };
}

/** "HATING KAPATID" becomes "Hating Kapatid"; mixed-case titles are kept. */
function toTitle(s: string): string {
  if (s !== s.toUpperCase()) return s;
  const small = new Set(['for', 'of', 'and', 'the', 'to', 'sa', 'ng', 'at', 'ang']);
  return s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.replace(/(^|-)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())))
    .join(' ');
}

/** Pages hold up to 400 characters; longer paragraphs are split at sentence ends. */
function splitLong(p: string): string[] {
  if (p.length <= 400) return [p];
  const sentences = p.match(/[^.!?]+[.!?]+["”’]?\s*|[^.!?]+$/g) ?? [p];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > 400) { out.push(cur.trim()); cur = ''; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** About 100 words per short lesson for struggling readers: 5 to 10 minutes with listening and practice. */
export const WORDS_PER_LESSON = 100;

export function suggestedLessonCount(paragraphs: string[]): number {
  const words = paragraphs.reduce((s, p) => s + countWords(p), 0);
  return Math.max(1, Math.min(6, Math.round(words / WORDS_PER_LESSON) || 1, paragraphs.length));
}

/** Splits paragraphs into `count` groups in story order, with word counts as even as possible. */
export function splitParagraphs(paragraphs: string[], count: number): string[][] {
  const n = Math.max(1, Math.min(count, paragraphs.length));
  const p = paragraphs.length;
  const prefix = [0];
  for (const para of paragraphs) prefix.push(prefix[prefix.length - 1] + countWords(para));
  const target = prefix[p] / n;
  // best[k][i]: lowest cost to put the first i paragraphs into k groups (cost = squared distance from the even share).
  const best = Array.from({ length: n + 1 }, () => new Array<number>(p + 1).fill(Infinity));
  const from = Array.from({ length: n + 1 }, () => new Array<number>(p + 1).fill(0));
  best[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = k; i <= p; i++) {
      for (let j = k - 1; j < i; j++) {
        const cost = best[k - 1][j] + (prefix[i] - prefix[j] - target) ** 2;
        if (cost < best[k][i]) {
          best[k][i] = cost;
          from[k][i] = j;
        }
      }
    }
  }
  const groups: string[][] = [];
  let end = p;
  for (let k = n; k > 0; k--) {
    const start = from[k][end];
    groups.unshift(paragraphs.slice(start, end));
    end = start;
  }
  return groups;
}

const tokenize = (s: string) => s.match(/[\p{L}]+(?:[-'’][\p{L}]+)*/gu) ?? [];

/** Names and other capitalised words that never appear in lower case are left out of practice. */
function vocabulary(paragraphs: string[]): Map<string, number> {
  const lower = new Map<string, number>();
  for (const w of paragraphs.flatMap(tokenize)) {
    if (w !== w.toLowerCase()) continue;
    lower.set(w, (lower.get(w) ?? 0) + 1);
  }
  return lower;
}

/** Up to `max` practice words for a part: new in this part, used often in the story, and not too short. */
export function pickReviewWords(part: string[], vocab: Map<string, number>, taken: Set<string>, max = 3): string[] {
  const seen = new Set<string>();
  const scored: { w: string; score: number; order: number }[] = [];
  tokenize(part.join(' ')).forEach((raw, order) => {
    const w = raw.toLowerCase();
    if (seen.has(w) || taken.has(w) || COMMON.has(w) || w.length < 5 || !vocab.has(w)) return;
    seen.add(w);
    scored.push({ w, score: (vocab.get(w) ?? 0) * 3 + Math.min(w.length, 10) / 2, order });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, max)
    .map((s) => s.w);
}

/** "Tap the word you hear": the right word plus two other story words that look different. */
function wordTap(word: string, pool: string[], seed: number): { prompt: string; choices: string[]; answer: number } {
  const others = pool.filter((w) => w !== word);
  const distinct = others.filter((w) => w[0] !== word[0]);
  const picks = [...distinct, ...others.filter((w) => !distinct.includes(w))].slice(seed % 3, (seed % 3) + 2);
  while (picks.length < 2 && others.length > picks.length) picks.push(others[picks.length]);
  const answer = seed % (picks.length + 1);
  const choices = [...picks];
  choices.splice(answer, 0, word);
  // The word is only spoken (in the teacher's recording), so the child listens instead of matching letters.
  return { prompt: 'Pakinggan, saka tapikin ang salitang maririnig mo.', choices, answer };
}

export function planUnit(parsed: ParsedLesson, lessonCount: number, title = parsed.title): UnitPlan {
  const groups = splitParagraphs(parsed.paragraphs, lessonCount);
  const vocab = vocabulary(parsed.paragraphs);
  const taken = new Set<string>();
  const words = groups.map((g) => pickReviewWords(g, vocab, taken).map((w) => (taken.add(w), w)));
  const pool = [...taken];
  const lessons = groups.map((g, i): PlannedLesson => {
    const n = g.reduce((s, p) => s + countWords(p), 0);
    return {
      title: `${title || 'Story'} · Part ${i + 1}`,
      paragraphs: g,
      words: n,
      minutes: Math.max(5, Math.min(10, 5 + Math.round(n / 40))),
      reviewWords: words[i],
      practice: pool.length >= 3 ? words[i].slice(0, 2).map((w, j) => wordTap(w, pool, i * 2 + j)) : [],
    };
  });
  return {
    lessons,
    checkpoint: {
      title: `${title || 'Story'} · Checkpoint`,
      intro: 'Natapos mo ang kuwento! Sagutin natin ang mga tanong tungkol dito.',
      questions: parsed.questions,
    },
  };
}
