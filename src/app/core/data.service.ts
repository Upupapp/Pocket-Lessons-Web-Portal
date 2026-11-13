import { Injectable, computed, signal } from '@angular/core';
import {
  Assessment,
  LEVELS,
  Learner,
  Lesson,
  LessonPage,
  Level,
  PACK_LIMIT_BYTES,
  daysSince,
  uid,
} from './models';
import { local, media } from './storage';

/** Pack overhead for the lesson manifest and app metadata. */
const PACK_OVERHEAD = 8 * 1024;

export interface PackCheck {
  label: string;
  ok: boolean;
  detail?: string;
}

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

function seedLearners(): Learner[] {
  const rows: [string, 1 | 2 | 3 | 4, Level, string][] = [
    ['Aya Santos', 2, 'Word', 'Lorna Santos (mother)'],
    ['Miguel Cruz', 3, 'Letter', 'Jun Cruz (father)'],
    ['Jasmine dela Rosa', 1, 'Beginner', 'Mila dela Rosa (grandmother)'],
    ['Paolo Ramos', 4, 'Paragraph', 'Grace Ramos (mother)'],
    ['Liza Mendoza', 2, 'Letter', 'Rey Mendoza (uncle)'],
    ['Carlo Bautista', 3, 'Word', 'Tess Bautista (mother)'],
    ['Rica Villanueva', 4, 'Story', 'Ana Villanueva (sister, 16)'],
    ['Joshua Garcia', 1, 'Beginner', 'Rosa Garcia (mother)'],
    ['Nica Flores', 2, 'Word', 'Ben Flores (father)'],
    ['Andrei Torres', 3, 'Paragraph', 'Luz Torres (mother)'],
    ['Bea Navarro', 1, 'Letter', 'Cora Navarro (grandmother)'],
    ['Kian Aquino', 4, 'Word', 'Ellen Aquino (mother)'],
  ];
  return rows.map(([name, grade, level, caregiver], i) => ({
    id: `lrn_seed_${i + 1}`,
    name,
    grade,
    level,
    caregiver,
    createdAt: iso(45),
  }));
}

function seedAssessments(learners: Learner[]): Assessment[] {
  const out: Assessment[] = [];
  learners.forEach((l, i) => {
    // Baseline placement for most learners; three still need their first check.
    if (i % 5 === 4) return;
    out.push({
      id: `asm_seed_p${i}`,
      learnerId: l.id,
      type: 'placement',
      date: iso(40 - i),
      level: l.level,
      note: 'Baseline placement (sample).',
      by: 'Ana Reyes',
    });
  });
  out.push({
    id: 'asm_seed_f1',
    learnerId: 'lrn_seed_1',
    type: 'fluency',
    date: iso(6),
    level: 'Word',
    previousLevel: 'Word',
    passage: 'Si Mimi ay pusa. Si Mimi ay puti.',
    wordsTotal: 8,
    missedIndexes: [7],
    seconds: 18,
    accuracy: 88,
    wcpm: 23,
    note: 'Paused on "puti". Close to Paragraph level.',
    by: 'Ana Reyes',
  });
  return out;
}

function seedLessons(): Lesson[] {
  const now = iso(2);
  const page = (id: string, text: string): LessonPage => ({ id, text });
  return [
    {
      id: 'lsn_seed_mimi',
      title: 'Si Mimi',
      level: 'Word',
      language: 'Filipino',
      objective: 'Read and match simple words about a cat.',
      minutes: 8,
      pages: [
        page('pg_seed_1', 'Si Mimi ay pusa.'),
        page('pg_seed_2', 'Si Mimi ay puti.'),
        page('pg_seed_3', 'Gusto ni Mimi ang isda.'),
      ],
      activities: [{ id: 'act_seed_1', prompt: 'Alin ang pusa?', choices: ['pusa', 'isda', 'bola'], answer: 0 }],
      status: 'draft',
      version: 1,
      assignedLevels: ['Word'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * All teaching data for the pilot preview: learners, lessons and reading assessments.
 * Saved in this browser. Replace the load/save calls with API calls when the backend is ready.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly learners = signal<Learner[]>([]);
  readonly lessons = signal<Lesson[]>([]);
  readonly assessments = signal<Assessment[]>([]);

  constructor() {
    if (!local.get<boolean>('seeded', false)) {
      const learners = seedLearners();
      local.set('learners', learners);
      local.set('lessons', seedLessons());
      local.set('assessments', seedAssessments(learners));
      local.set('seeded', true);
    }
    this.learners.set(local.get<Learner[]>('learners', []));
    this.lessons.set(local.get<Lesson[]>('lessons', []));
    this.assessments.set(local.get<Assessment[]>('assessments', []));
  }

  // ---------- Derived views ----------

  readonly levelCounts = computed(() =>
    LEVELS.map((level) => ({ level, count: this.learners().filter((l) => l.level === level).length })),
  );

  readonly lastCheck = computed(() => {
    const map = new Map<string, Assessment>();
    for (const a of this.assessments()) {
      const prev = map.get(a.learnerId);
      if (!prev || a.date > prev.date) map.set(a.learnerId, a);
    }
    return map;
  });

  /** Learners with no check in 30 days, oldest first. */
  readonly needsCheck = computed(() =>
    this.learners()
      .map((l) => ({ learner: l, last: this.lastCheck().get(l.id) }))
      .filter((r) => !r.last || daysSince(r.last.date) > 30)
      .sort((a, b) => (a.last?.date ?? '').localeCompare(b.last?.date ?? '')),
  );

  learner(id: string): Learner | undefined {
    return this.learners().find((l) => l.id === id);
  }

  lesson(id: string): Lesson | undefined {
    return this.lessons().find((l) => l.id === id);
  }

  assessmentsFor(learnerId: string): Assessment[] {
    return this.assessments()
      .filter((a) => a.learnerId === learnerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // ---------- Learners ----------

  addLearner(input: Omit<Learner, 'id' | 'createdAt'>): Learner {
    const learner: Learner = { ...input, id: uid('lrn'), createdAt: new Date().toISOString() };
    this.saveLearners([...this.learners(), learner]);
    return learner;
  }

  updateLearner(learner: Learner): void {
    this.saveLearners(this.learners().map((l) => (l.id === learner.id ? learner : l)));
  }

  removeLearner(id: string): void {
    this.saveLearners(this.learners().filter((l) => l.id !== id));
    this.saveAssessments(this.assessments().filter((a) => a.learnerId !== id));
  }

  // ---------- Assessments ----------

  addAssessment(input: Omit<Assessment, 'id'>): Assessment {
    const assessment: Assessment = { ...input, id: uid('asm') };
    this.saveAssessments([...this.assessments(), assessment]);
    const learner = this.learner(input.learnerId);
    if (learner && learner.level !== input.level) this.updateLearner({ ...learner, level: input.level });
    return assessment;
  }

  // ---------- Lessons ----------

  newLesson(level: Level = 'Word'): Lesson {
    const now = new Date().toISOString();
    return {
      id: uid('lsn'),
      title: '',
      level,
      language: 'Filipino',
      objective: '',
      minutes: 8,
      pages: [{ id: uid('pg'), text: '' }],
      activities: [],
      status: 'draft',
      version: 1,
      assignedLevels: [level],
      createdAt: now,
      updatedAt: now,
    };
  }

  saveLesson(lesson: Lesson): void {
    const updated = { ...lesson, updatedAt: new Date().toISOString() };
    const exists = this.lessons().some((l) => l.id === lesson.id);
    this.saveLessons(exists ? this.lessons().map((l) => (l.id === lesson.id ? updated : l)) : [updated, ...this.lessons()]);
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = this.lesson(id);
    this.saveLessons(this.lessons().filter((l) => l.id !== id));
    for (const p of lesson?.pages ?? []) {
      if (p.audioId) await media.delete(p.audioId).catch(() => undefined);
      if (p.pictureId) await media.delete(p.pictureId).catch(() => undefined);
    }
  }

  packBytes(lesson: Lesson): number {
    const text = new TextEncoder().encode(
      JSON.stringify({ t: lesson.title, p: lesson.pages.map((p) => p.text), a: lesson.activities }),
    ).length;
    return lesson.pages.reduce((sum, p) => sum + (p.audioBytes ?? 0) + (p.pictureBytes ?? 0), text + PACK_OVERHEAD);
  }

  packChecks(lesson: Lesson): PackCheck[] {
    const bytes = this.packBytes(lesson);
    const noText = lesson.pages.filter((p) => !p.text.trim()).length;
    const noAudio = lesson.pages.filter((p) => !p.audioId).length;
    const badActivities = lesson.activities.filter(
      (a) => !a.prompt.trim() || a.choices.some((c) => !c.trim()) || a.answer < 0,
    ).length;
    return [
      { label: 'Lesson has a title', ok: lesson.title.trim().length > 0 },
      { label: 'Every page has text', ok: lesson.pages.length > 0 && noText === 0, detail: noText ? `${noText} page(s) empty` : undefined },
      {
        label: 'Every page has your recorded voice',
        ok: lesson.pages.length > 0 && noAudio === 0,
        detail: noAudio ? `${noAudio} page(s) need a recording` : undefined,
      },
      { label: 'Activities are complete', ok: badActivities === 0, detail: badActivities ? `${badActivities} activity(ies) incomplete` : undefined },
      { label: 'Assigned to at least one reading level', ok: lesson.assignedLevels.length > 0 },
      { label: 'Pack is under 2 MB', ok: bytes <= PACK_LIMIT_BYTES },
    ];
  }

  publish(lesson: Lesson): Lesson {
    const published: Lesson = {
      ...lesson,
      status: 'published',
      version: lesson.status === 'published' ? lesson.version + 1 : lesson.version,
      publishedAt: new Date().toISOString(),
    };
    this.saveLesson(published);
    return published;
  }

  resetAll(): void {
    local.clearAll();
    media.clear().catch(() => undefined);
  }

  // ---------- Persistence ----------

  private saveLearners(v: Learner[]): void {
    this.learners.set(v);
    local.set('learners', v);
  }
  private saveLessons(v: Lesson[]): void {
    this.lessons.set(v);
    local.set('lessons', v);
  }
  private saveAssessments(v: Assessment[]): void {
    this.assessments.set(v);
    local.set('assessments', v);
  }
}
