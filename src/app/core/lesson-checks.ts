/**
 * The lesson's pack check, part by part: what is missing, exactly where it is in the editor, whether it can be
 * skipped with "Publish anyway", what the child gets if it is, and which fix the editor can offer.
 * Keep the keys and the required list in step with the server (src/teaching/pack-checks.ts).
 */
import { Activity, Lesson, MAX_CHOICES, MIN_CHOICES, PACK_LIMIT_BYTES, uid } from './models';
import type { SubjectKey } from './subjects';

export type CheckKey = 'title' | 'subject' | 'text' | 'voice' | 'activities' | 'checkpoint' | 'review' | 'class' | 'size';

/** These three can never be skipped: nobody would get the lesson, a child would get stuck, or it is too heavy. */
export const REQUIRED_CHECKS: readonly CheckKey[] = ['activities', 'class', 'size'];

export const CHECK_LABELS: Record<CheckKey, string> = {
  title: 'Lesson has a title',
  subject: 'Subject chosen',
  text: 'Every page has text',
  voice: 'Every page has your recorded voice',
  activities: 'Activities are complete',
  checkpoint: 'Checkpoint has questions',
  review: 'Suggested questions are checked',
  class: 'Sent to at least one class',
  size: 'Pack is under 2 MB',
};

/** What the child gets when a skippable check is skipped (shown before "Publish anyway"). */
export const IF_SKIPPED: Record<CheckKey, string> = {
  title: 'The lesson shows the unit title and part number instead.',
  subject: 'The lesson appears in the General world.',
  text: 'Those pages show only the picture and your voice.',
  voice: 'Those pages play silently: the words still light up, but children who cannot read yet will need help.',
  activities: '',
  checkpoint: 'The checkpoint plays as a normal story lesson, with no quiz.',
  review: 'The suggested questions are used as they are.',
  class: '',
  size: '',
};

export type FixKind =
  | 'title'
  | 'subject'
  | 'remove-page'
  | 'remove-question'
  | 'accept-question'
  | 'record-all'
  | 'computer-voice'
  | 'suggest'
  | 'ask-admin'
  | 'lighter';

/** One missing part: what it is, where it is, and what can be done about it. */
export interface Issue {
  /** Unique within the lesson, stable while the part exists. */
  id: string;
  check: CheckKey;
  required: boolean;
  /** "Page 3 · Isulat ang numero…" */
  where: string;
  /** "Needs your voice" */
  what: string;
  /** The element to scroll to (its id in the editor). */
  target: string;
  /** Inside the target: what gets the cursor, as a CSS selector. */
  focus?: string;
  fix?: FixKind;
  /** The page or question number in the lesson (0-based), for the fixes that need it. */
  index?: number;
}

export interface PackCheck {
  key: CheckKey;
  label: string;
  ok: boolean;
  required: boolean;
  detail?: string;
}

const snippet = (text: string) => {
  const t = text.trim().replace(/\s+/g, ' ');
  return t ? `“${t.length > 28 ? t.slice(0, 28).trimEnd() + '…' : t}”` : '';
};

function questionProblem(a: Activity): string {
  if (!a.prompt.trim()) return 'Write the question';
  if (a.choices.length < MIN_CHOICES || a.choices.length > MAX_CHOICES) return 'Needs 2 to 4 choices';
  if (a.choices.some((c) => !c.trim())) return 'A choice is empty';
  if (a.answer < 0 || a.answer >= a.choices.length) return 'Tick the right answer';
  return '';
}

/**
 * Every missing part of the lesson, required ones first.
 * canSendToClass: the teacher has at least one class to send to (otherwise the fix is "Ask your administrator").
 */
export function lessonIssues(lesson: Lesson, bytes: number, canSendToClass: boolean): Issue[] {
  const out: Issue[] = [];
  const checkpoint = lesson.kind === 'checkpoint';
  const qWord = checkpoint ? 'Question' : 'Activity';

  // Required
  lesson.activities.forEach((a, i) => {
    const problem = questionProblem(a);
    if (problem) {
      out.push({ id: `act-${a.id}`, check: 'activities', required: true, where: `${qWord} ${i + 1}${a.prompt.trim() ? ' · ' + snippet(a.prompt) : ''}`, what: problem, target: `act-${a.id}`, focus: 'input:not([type=radio])', fix: 'remove-question', index: i });
    }
  });
  if (!(lesson.classIds ?? []).length) {
    out.push({ id: 'class', check: 'class', required: true, where: 'Send to classes', what: canSendToClass ? 'Choose at least one class' : 'You have no class yet', target: 'sec-classes', focus: 'input', fix: canSendToClass ? undefined : 'ask-admin' });
  }
  if (bytes > PACK_LIMIT_BYTES) {
    out.push({ id: 'size', check: 'size', required: true, where: 'Pack check', what: 'Over 2 MB: too heavy for older phones', target: 'sec-pack', fix: 'lighter' });
  }

  // Can be finished later
  if (!lesson.title.trim()) out.push({ id: 'title', check: 'title', required: false, where: 'Lesson title', what: 'No title yet', target: 'f-title', focus: 'input', fix: 'title' });
  if (!lesson.subject) out.push({ id: 'subject', check: 'subject', required: false, where: 'Lesson basics', what: 'No subject chosen', target: 'f-subject', focus: 'select', fix: 'subject' });
  lesson.pages.forEach((p, i) => {
    if (!p.text.trim()) {
      out.push({ id: `text-${p.id}`, check: 'text', required: false, where: `Page ${i + 1}`, what: 'No text', target: `pg-${p.id}`, focus: 'textarea', fix: lesson.pages.length > 1 ? 'remove-page' : undefined, index: i });
    }
  });
  lesson.pages.forEach((p, i) => {
    if (!p.audioId) {
      out.push({ id: `voice-${p.id}`, check: 'voice', required: false, where: `Page ${i + 1}${p.text.trim() ? ' · ' + snippet(p.text) : ''}`, what: 'Needs your voice', target: `pg-${p.id}`, focus: 'pl-voice-recorder button', fix: 'record-all', index: i });
    }
  });
  if (checkpoint && !lesson.activities.some((a) => !a.auto)) {
    out.push({ id: 'checkpoint', check: 'checkpoint', required: false, where: 'Checkpoint questions', what: lesson.activities.length ? 'Check the suggested questions' : 'No questions yet', target: 'sec-acts', fix: lesson.activities.length ? undefined : 'suggest' });
  }
  lesson.activities.forEach((a, i) => {
    if (a.auto && !questionProblem(a)) {
      out.push({ id: `review-${a.id}`, check: 'review', required: false, where: `${qWord} ${i + 1} · ${snippet(a.prompt)}`, what: 'Suggested: check it', target: `act-${a.id}`, focus: 'input:not([type=radio])', fix: 'accept-question', index: i });
    }
  });
  return out;
}

/** The pack check card: one line per check, as before, now with its key and kind. */
export function packChecks(lesson: Lesson, bytes: number): PackCheck[] {
  const issues = lessonIssues(lesson, bytes, true);
  const count = (k: CheckKey) => issues.filter((i) => i.check === k).length;
  const line = (key: CheckKey, detail?: string): PackCheck => ({ key, label: CHECK_LABELS[key], ok: count(key) === 0, required: REQUIRED_CHECKS.includes(key), detail: count(key) ? detail : undefined });
  const checks = [
    line('title'),
    line('subject', 'Choose a subject in Lesson basics'),
    line('text', `${count('text')} page(s) empty`),
    line('voice', `${count('voice')} page(s) need a recording`),
    line('activities', `${count('activities')} activity(ies) incomplete`),
    ...(lesson.kind === 'checkpoint' ? [line('checkpoint', 'Add the story questions')] : []),
    ...(lesson.activities.some((a) => a.auto) ? [line('review', `${count('review')} suggested question(s) to check`)] : []),
    line('class', 'Choose classes below'),
    line('size'),
  ];
  if (!lesson.pages.length) {
    for (const c of checks) if (c.key === 'text' || c.key === 'voice') c.ok = false;
  }
  return checks;
}

/** The keys of the checks the lesson fails (what "Publish anyway" skips). */
export function failingChecks(lesson: Lesson, bytes: number): CheckKey[] {
  return packChecks(lesson, bytes)
    .filter((c) => !c.ok)
    .map((c) => c.key);
}

// ------------------------------------------------------------------ fixes

/** A title for a lesson with none: its unit and part, or the first words of page 1. */
export function suggestTitle(lesson: Lesson, unitTitle?: string): string {
  if (unitTitle) return lesson.kind === 'checkpoint' ? `${unitTitle} · Checkpoint` : `${unitTitle} · Part ${(lesson.unitIndex ?? 0) + 1}`;
  const first = lesson.pages.find((p) => p.text.trim())?.text.trim().split(/[.!?\n]/)[0] ?? '';
  return first.length > 40 ? first.slice(0, 40).trimEnd() + '…' : first || 'My lesson';
}

const SUBJECT_WORDS: [SubjectKey, RegExp][] = [
  ['math', /\b(numero|bilang|isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu|dagdag|bawas|plus|minus|number|numbers|count|add|subtract|math|matematika|shapes?|hugis)\b/gi],
  ['alpabasa', /\b(titik|letra|letter|letters|alpabeto|abakada|tunog|sound)\b/gi],
  ['science', /\b(halaman|hayop|tubig|ulan|katawan|kalusugan|plant|plants|animal|animals|water|weather|body|health|science|agham)\b/gi],
  ['gmrc', /\b(tapat|paggalang|galang|respeto|kabutihan|tulong|honest|respect|kind|kindness|values|gmrc)\b/gi],
  ['makabansa', /\b(bansa|komunidad|bayan|pilipinas|barangay|community|country|watawat|flag)\b/gi],
  ['arts', /\b(kulay|guhit|sining|awit|kanta|sayaw|color|colour|draw|drawing|art|music|song|dance)\b/gi],
  ['digital', /\b(computer|kompyuter|internet|cellphone|phone|digital|online)\b/gi],
];

/** The subject that best fits the lesson's words (and the unit title), or a reading world by language. */
export function suggestSubject(lesson: Lesson, unitTitle = ''): SubjectKey {
  const text = [unitTitle, lesson.title, lesson.objective, ...lesson.pages.map((p) => p.text)].join(' ');
  let best: SubjectKey | null = null;
  let bestScore = 0;
  for (const [key, re] of SUBJECT_WORDS) {
    const score = (text.match(re) ?? []).length + (key === 'math' ? (text.match(/\d+/g) ?? []).length * 0.5 : 0);
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  if (best && bestScore >= 2) return best;
  return lesson.language === 'English' ? 'english' : 'pagbasa';
}

/**
 * Draft checkpoint questions made from the unit's own text, with no outside service.
 * "Fill in the missing word" from story sentences; for numbers, "Which is bigger?" and "What comes next?".
 * Every question is marked as suggested (auto): the teacher checks it before it counts.
 */
export function suggestQuestions(texts: string[], max = 5): Activity[] {
  const all = texts.join(' ').replace(/\s+/g, ' ').trim();
  const words = [...new Set((all.match(/[A-Za-zÀ-ÿñÑ'-]{3,}/g) ?? []).map((w) => w.toLowerCase()))];
  const sentences = all
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 4 && s.length <= 140);
  const out: Activity[] = [];
  const rotate = <T,>(list: T[], by: number) => list.map((_, i) => list[(i + by) % list.length]);

  // Numbers in the story: two number questions.
  const numbers = [...new Set((all.match(/\b\d{1,3}\b/g) ?? []).map(Number))];
  if (numbers.length >= 2) {
    const [a, b] = numbers;
    out.push({ id: uid('act'), prompt: 'Alin ang mas malaki?', choices: [String(a), String(b)], answer: a > b ? 0 : 1, auto: true });
  }
  if (numbers.length >= 1) {
    const n = numbers[numbers.length - 1];
    const choices = rotate([String(n + 1), String(n + 2), String(Math.max(0, n - 1))], out.length);
    out.push({ id: uid('act'), prompt: `Anong numero ang kasunod ng ${n}?`, choices, answer: choices.indexOf(String(n + 1)), auto: true });
  }

  // Fill in the missing word, from different sentences.
  for (const s of sentences) {
    if (out.length >= max) break;
    const inSentence = (s.match(/[A-Za-zÀ-ÿñÑ'-]{3,}/g) ?? []).map((w) => w.toLowerCase());
    const target = [...inSentence].sort((x, y) => y.length - x.length)[0];
    if (!target || target.length < 4) continue;
    const others = words.filter((w) => w !== target && !inSentence.includes(w) && Math.abs(w.length - target.length) <= 3).slice(0, 2);
    if (others.length < 2) continue;
    const blanked = s.replace(new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '____');
    const choices = rotate([target, ...others], out.length);
    out.push({ id: uid('act'), prompt: `Punan ang patlang: “${blanked}”`, choices, answer: choices.indexOf(target), auto: true });
  }
  return out.slice(0, max);
}
