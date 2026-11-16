import { Injectable, computed, signal } from '@angular/core';
import {
  Assessment,
  LEVELS,
  Learner,
  Lesson,
  LessonPage,
  Level,
  MAX_CHOICES,
  MIN_CHOICES,
  PACK_LIMIT_BYTES,
  Unit,
  daysSince,
  uid,
} from './models';
import { UnitPlan } from './lesson-import';
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
  readonly units = signal<Unit[]>([]);

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
    this.units.set(local.get<Unit[]>('units', []));
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
    if (lesson) await this.deleteMedia(lesson);
  }

  /** Every recording and picture a lesson uses, so they can be removed with it. */
  async deleteMedia(lesson: Lesson): Promise<void> {
    const ids = [
      ...lesson.pages.flatMap((p) => [p.audioId, p.pictureId]),
      ...lesson.activities.map((a) => a.audioId),
    ].filter((x): x is string => !!x);
    for (const id of ids) await media.delete(id).catch(() => undefined);
  }

  packBytes(lesson: Lesson): number {
    const text = new TextEncoder().encode(
      JSON.stringify({ t: lesson.title, p: lesson.pages.map((p) => p.text), a: lesson.activities, r: lesson.reviewWords }),
    ).length;
    const voice = lesson.activities.reduce((sum, a) => sum + (a.audioBytes ?? 0), 0);
    return lesson.pages.reduce((sum, p) => sum + (p.audioBytes ?? 0) + (p.pictureBytes ?? 0), text + voice + PACK_OVERHEAD);
  }

  // ---------- Units: a story split into short lessons plus a checkpoint ----------

  unit(id: string): Unit | undefined {
    return this.units().find((u) => u.id === id);
  }

  /** The unit's lessons in path order; the checkpoint comes last. */
  unitLessons(unitId: string): Lesson[] {
    return this.lessons()
      .filter((l) => l.unitId === unitId)
      .sort((a, b) => (a.unitIndex ?? 0) - (b.unitIndex ?? 0));
  }

  /** Creates the unit and its draft lessons from an import plan. Returns the new unit. */
  createUnit(
    info: Omit<Unit, 'id' | 'createdAt'>,
    plan: UnitPlan,
  ): Unit {
    const now = new Date().toISOString();
    const unit: Unit = { ...info, id: uid('unt'), createdAt: now };
    const base = {
      level: info.level,
      language: info.language,
      status: 'draft' as const,
      version: 1,
      assignedLevels: [info.level],
      createdAt: now,
      updatedAt: now,
      unitId: unit.id,
    };
    const lessons: Lesson[] = plan.lessons.map((p, i) => ({
      ...base,
      id: uid('lsn'),
      title: p.title,
      objective: `Reads part ${i + 1} of "${info.title}"${p.reviewWords.length ? ` and practises: ${p.reviewWords.join(', ')}` : ''}.`,
      minutes: p.minutes,
      pages: p.paragraphs.map((text) => ({ id: uid('pg'), text })),
      activities: p.practice.map((a) => ({ id: uid('act'), ...a, auto: true })),
      unitIndex: i,
      kind: 'lesson',
      reviewWords: p.reviewWords,
    }));
    const n = plan.checkpoint.questions.length;
    lessons.push({
      ...base,
      id: uid('lsn'),
      title: plan.checkpoint.title,
      objective: `Answers ${n} question${n === 1 ? '' : 's'} about the whole story. Passing flags the child for an in-person reading check.`,
      minutes: Math.max(5, Math.min(10, 3 + n)),
      pages: [{ id: uid('pg'), text: plan.checkpoint.intro }],
      activities: plan.checkpoint.questions.map((q) => ({ id: uid('act'), prompt: q.prompt, choices: q.choices, answer: q.answer })),
      unitIndex: plan.lessons.length,
      kind: 'checkpoint',
      reviewWords: [],
    });
    this.saveUnits([unit, ...this.units()]);
    this.saveLessons([...lessons, ...this.lessons()]);
    return unit;
  }

  async deleteUnit(id: string): Promise<void> {
    const lessons = this.unitLessons(id);
    this.saveLessons(this.lessons().filter((l) => l.unitId !== id));
    this.saveUnits(this.units().filter((u) => u.id !== id));
    for (const l of lessons) await this.deleteMedia(l);
  }

  packChecks(lesson: Lesson): PackCheck[] {
    const bytes = this.packBytes(lesson);
    const noText = lesson.pages.filter((p) => !p.text.trim()).length;
    const noAudio = lesson.pages.filter((p) => !p.audioId).length;
    const badActivities = lesson.activities.filter(
      (a) =>
        !a.prompt.trim() ||
        a.choices.length < MIN_CHOICES ||
        a.choices.length > MAX_CHOICES ||
        a.choices.some((c) => !c.trim()) ||
        a.answer < 0 ||
        a.answer >= a.choices.length,
    ).length;
    const checkpoint = lesson.kind === 'checkpoint';
    return [
      { label: 'Lesson has a title', ok: lesson.title.trim().length > 0 },
      { label: 'Every page has text', ok: lesson.pages.length > 0 && noText === 0, detail: noText ? `${noText} page(s) empty` : undefined },
      {
        label: 'Every page has your recorded voice',
        ok: lesson.pages.length > 0 && noAudio === 0,
        detail: noAudio ? `${noAudio} page(s) need a recording` : undefined,
      },
      { label: 'Activities are complete', ok: badActivities === 0, detail: badActivities ? `${badActivities} activity(ies) incomplete` : undefined },
      ...(checkpoint
        ? [{ label: 'Checkpoint has questions', ok: lesson.activities.length > 0, detail: lesson.activities.length ? undefined : 'Add the story questions' }]
        : []),
      { label: 'Assigned to at least one reading level', ok: lesson.assignedLevels.length > 0 },
      { label: 'Pack is under 2 MB', ok: bytes <= PACK_LIMIT_BYTES },
    ];
  }

  /** Publishing locks a version. Editing a published lesson returns it to draft; publishing again makes the next version. */
  publish(lesson: Lesson): Lesson {
    const published: Lesson = {
      ...lesson,
      status: 'published',
      version: lesson.publishedAt ? lesson.version + 1 : lesson.version,
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
  private saveUnits(v: Unit[]): void {
    this.units.set(v);
    local.set('units', v);
  }
  private saveAssessments(v: Assessment[]): void {
    this.assessments.set(v);
    local.set('assessments', v);
  }
}
