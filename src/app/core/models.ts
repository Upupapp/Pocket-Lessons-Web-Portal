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
  passwordHash: string;
  center: string;
  role: 'Teacher' | 'Facilitator' | 'Program staff';
}

export interface Learner {
  id: string;
  name: string;
  grade: 1 | 2 | 3 | 4;
  level: Level;
  caregiver: string;
  createdAt: string;
}

export interface LessonPage {
  id: string;
  text: string;
  /** IndexedDB keys for the recorded voice and the optional picture. */
  audioId?: string;
  audioBytes?: number;
  audioSeconds?: number;
  pictureId?: string;
  pictureBytes?: number;
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
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Set when the lesson belongs to a unit (a story split into short lessons plus a checkpoint). */
  unitId?: string;
  unitIndex?: number;
  kind?: LessonKind;
  /** Words that come back in spaced review if the child misses them. */
  reviewWords?: string[];
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
  createdAt: string;
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

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
