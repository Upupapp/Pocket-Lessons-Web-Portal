import type { SubjectKey } from './subjects';

/** Teaching at the Right Level (TaRL) reading levels, lowest to highest. */
export const LEVELS = ['Beginner', 'Letter', 'Word', 'Paragraph', 'Story'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_HINT: Record<Level, string> = {
  Beginner: 'Cannot yet name most letters',
  Letter: 'Knows letters and their sounds',
  Word: 'Reads simple words',
  Paragraph: 'Reads a short paragraph',
  Story: 'Reads a short story with understanding',
};

export const LANGUAGES = ['Filipino', 'English', 'Cebuano', 'Hiligaynon', 'Ilocano', 'Waray'] as const;

/** The pilot target: every lesson pack stays under 2 MB so it moves easily over a hotspot or phone to phone. */
export const PACK_LIMIT_BYTES = 2 * 1024 * 1024;

export interface User {
  id: string;
  name: string;
  email: string;
  /** Browser-only pilot preview. With the API, passwords never reach the portal's storage. */
  passwordHash?: string;
  center: string;
  centerId?: string;
  role: 'Teacher' | 'Facilitator' | 'Program staff' | 'Admin';
}

export interface Learner {
  id: string;
  name: string;
  grade: 1 | 2 | 3 | 4;
  level: Level;
  caregiver: string;
  createdAt: string;
}

/** A word card on the phone: "Number Form" · "Symbol of a number." */
export interface TermItem {
  term: string;
  meaning: string;
  example?: string;
}

/** One step of a step path: the step in English, its Filipino line, and the numbers that go with it. */
export interface StepItem {
  text: string;
  note?: string;
  chips?: string[];
}

/** A number and its word name: "40 · forty". */
export interface PairItem {
  n: string;
  word: string;
}

/** How the child answers a numbered activity: the number pad, word tiles, or 2 to 4 choices. */
export type AnswerType = 'number' | 'words' | 'choice';

/** One numbered item of an activity (numbered as on the paper worksheet) and its answer key. */
export interface SetItem {
  n: number;
  /** What the child sees: "538", "Seventy-Eight", "Jasmine - Thirty-five Pesos". */
  prompt: string;
  /** The answer from the Key to Correction. Empty until the teacher fills it in. */
  answer: string;
  /** Other answers that also count as right, e.g. "five hundred thirty-eight" without "and". */
  accept?: string[];
}

/**
 * The parts a lesson page can be built from. The phone shows each in its own way: text on pad-paper lines,
 * word cards, point cards, a step path, number cards, worked examples, or a numbered activity checked on the phone.
 */
export type Block =
  | { type: 'text'; text: string }
  | { type: 'route'; items: string[] }
  | { type: 'terms'; items: TermItem[] }
  | { type: 'bullets'; title?: string; items: string[] }
  | { type: 'steps'; title?: string; items: StepItem[] }
  | { type: 'numbers'; title?: string; items: PairItem[] }
  | { type: 'examples'; title?: string; items: PairItem[] }
  | { type: 'set'; title: string; instruction: string; answer: AnswerType; items: SetItem[]; cheer?: string; praise?: string };

export type BlockType = Block['type'];
export type SetBlock = Extract<Block, { type: 'set' }>;

export interface LessonPage {
  id: string;
  /** The page's words. For a page built from blocks, a plain-text copy of them (for checks and the computer voice). */
  text: string;
  /** The part of AHA's lesson routine this page belongs to ("Magic Word", "Bata Break", "#OOTD", …). */
  section?: string;
  /** When set, the phone shows these blocks instead of the plain text. */
  blocks?: Block[];
  /** IndexedDB keys for the recorded voice and the optional picture. */
  audioId?: string;
  audioBytes?: number;
  audioSeconds?: number;
  pictureId?: string;
  pictureBytes?: number;
  /** "computer": a labelled computer voice stands in until the teacher records this page herself. */
  voice?: 'teacher' | 'computer';
}

/** A tap question. Children answer by tapping one of 2 to 4 choices, never by typing. */
export interface Activity {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  /** The teacher reading the question aloud (optional). */
  audioId?: string;
  audioBytes?: number;
  audioSeconds?: number;
  /** Made by the file import; the teacher should check it. */
  auto?: boolean;
}

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 4;

/** The share of checkpoint questions a child must get right (UpUp proposal, for AHA to confirm). */
export const PASS_MARK = 0.8;

export type LessonStatus = 'draft' | 'published';
export type LessonKind = 'lesson' | 'checkpoint';

export interface Lesson {
  id: string;
  title: string;
  level: Level;
  language: string;
  objective: string;
  minutes: number;
  pages: LessonPage[];
  activities: Activity[];
  status: LessonStatus;
  version: number;
  assignedLevels: Level[];
  /** The classes that get this lesson: only children in them download it. Needed before publishing. */
  classIds?: string[];
  /** "Publish anyway": what the published version left out (for example ["voice"]), to finish later. */
  skippedChecks?: import('./lesson-checks').CheckKey[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Set when the lesson belongs to a unit (a story split into short lessons plus a checkpoint). */
  unitId?: string;
  unitIndex?: number;
  kind?: LessonKind;
  /** Words that come back in spaced review if the child misses them. */
  reviewWords?: string[];
  /** The subject world children see it in. Needed before publishing. */
  subject?: SubjectKey;
}

/** A story split into short lessons on one learning path, ending with a checkpoint. */
export interface Unit {
  id: string;
  title: string;
  author?: string;
  level: Level;
  language: string;
  /** The file the unit was imported from, and the label printed on it (e.g. "Reading for Grades 1-2 · Aralin 1"). */
  sourceFile?: string;
  sourceLabel?: string;
  /** The subject world of the whole unit; its lessons share it. */
  subject?: SubjectKey;
  createdAt: string;
}

/** A class at the teacher's center, for the "Send to classes" picker. The administrator manages classes. */
export interface ClassInfo {
  id: string;
  name: string;
  program: string;
  level: string;
  schedule: string;
  teacherName?: string;
  children: number;
  /** The signed-in teacher's own class. */
  mine: boolean;
  /** Teachers can send lessons only to their own classes. */
  canSend: boolean;
}

/** A lesson a child finished on the family phone (sent back at the phone's next check-in). */
export interface LessonResult {
  id: string;
  learnerId: string;
  lessonId: string;
  lessonVersion: number;
  completedAt: string;
  receivedAt: string;
  correct: number;
  questions: number;
  seconds: number;
}

export type AssessmentType = 'placement' | 'fluency';

export interface Assessment {
  id: string;
  learnerId: string;
  type: AssessmentType;
  date: string;
  /** Level recorded after this check. */
  level: Level;
  previousLevel?: Level;
  /** Fluency checks only. */
  passage?: string;
  wordsTotal?: number;
  missedIndexes?: number[];
  seconds?: number;
  accuracy?: number;
  wcpm?: number;
  note: string;
  by: string;
}

export function uid(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${Date.now().toString(36)}${rand[0].toString(36)}${rand[1].toString(36)}`.slice(0, 24);
}

export function levelIndex(level: Level): number {
  return LEVELS.indexOf(level);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** "1 page", "3 pages", "1 activity", "2 activities". */
export function plural(n: number, one: string, many = /[^aeiou]y$/.test(one) ? `${one.slice(0, -1)}ies` : `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
