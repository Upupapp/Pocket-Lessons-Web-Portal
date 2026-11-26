import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ApiError, api, apiMode } from './api';
import { AuthService } from './auth.service';
import {
  Assessment,
  ClassInfo,
  LEVELS,
  Learner,
  Lesson,
  LessonResult,
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
import { ProcessError } from './processing';
import { baselineDay, baselineLevel, neverChecked, sampleHistory } from './sample-history';
import type { SubjectKey } from './subjects';
import { CheckKey, PackCheck, packChecks as checkLesson } from './lesson-checks';
import type { Recording } from '../shared/voice-recorder';

/** What the lesson editor needs to know about the signed-in teacher and her center. */
export interface TeacherSettings {
  /** The administrator allows the labelled computer voice at this center, and a speech service is set up. */
  computerVoice: boolean;
  /** When the teacher asked the administrator for a class ("Ask your administrator"). */
  classRequestedAt?: string;
}
import { local, media } from './storage';

/** Pack overhead for the lesson manifest and app metadata. */
const PACK_OVERHEAD = 8 * 1024;

export type { PackCheck } from './lesson-checks';

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

/** Twelve weeks of made-up reading checks for the sample learners, so the dashboard charts have shape. */
function historyFor(learners: Learner[]): Assessment[] {
  return sampleHistory(learners.filter((l) => /^lrn_seed_\d+$/.test(l.id))).map(({ daysAgo, ...h }) => ({
    ...h,
    level: h.level as Level,
    previousLevel: h.previousLevel as Level,
    date: iso(daysAgo),
    by: 'Ana Reyes',
  }));
}

function seedAssessments(learners: Learner[]): Assessment[] {
  const out: Assessment[] = [];
  learners.forEach((l, i) => {
    // Baseline placement for most learners; two still need their first check.
    if (neverChecked(i)) return;
    out.push({
      id: `asm_seed_p${i}`,
      learnerId: l.id,
      type: 'placement',
      date: iso(baselineDay(i)),
      level: baselineLevel(i, l.level) as Level,
      note: 'Baseline placement (sample).',
      by: 'Ana Reyes',
    });
  });
  out.push(...historyFor(learners));
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
      subject: 'pagbasa',
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

interface CenterData {
  learners: Learner[];
  lessons: Lesson[];
  units: Unit[];
  assessments: Assessment[];
  classes?: ClassInfo[];
  results?: LessonResult[];
  settings?: TeacherSettings;
}

/** The pilot preview's classes at Better World Tondo (the same groups the server's sample data has). */
function previewClasses(learners: Learner[]): ClassInfo[] {
  const count = (lv: Level[]) => learners.filter((l) => lv.includes(l.level)).length;
  return [
    { id: 'cls_seed_a', name: 'Group A', program: 'TaRL English', level: 'Letter', schedule: 'Mon to Fri · 1:00 PM', teacherName: 'Ana Reyes', children: count(['Beginner', 'Letter']), mine: true, canSend: true },
    { id: 'cls_seed_b', name: 'Group B', program: 'TaRL Filipino', level: 'Word', schedule: 'Mon to Fri · 3:00 PM', teacherName: 'Ana Reyes', children: count(['Word']), mine: true, canSend: true },
    { id: 'cls_seed_c', name: 'Group C', program: 'Pagbasa', level: 'Paragraph', schedule: 'Mon to Fri · 4:30 PM', children: count(['Paragraph', 'Story']), mine: false, canSend: false },
  ];
}

/**
 * All teaching data: learners, lessons, story units and reading assessments.
 * - With the API: loaded from the server after sign-in. Pages update at once; each change is then sent
 *   to the server in order (a unit before its lessons, a child before their checks).
 * - Pilot preview: saved in this browser, with sample data on first run.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly learners = signal<Learner[]>([]);
  readonly lessons = signal<Lesson[]>([]);
  readonly assessments = signal<Assessment[]>([]);
  readonly units = signal<Unit[]>([]);
  /** The center's classes (lessons are sent to classes) and what children finished on the family phones. */
  readonly classes = signal<ClassInfo[]>([]);
  readonly results = signal<LessonResult[]>([]);
  readonly settings = signal<TeacherSettings>({ computerVoice: false });

  /** False while the signed-in center's records are loading from the server. */
  readonly ready = signal(!apiMode);
  readonly loadError = signal('');
  /** Set when a change could not be saved on the server. */
  readonly syncError = signal('');
  private readonly pending = signal(0);
  /** True while changes are still on their way to the server. */
  readonly syncing = computed(() => this.pending() > 0);
  /** Counts changes the server did not accept, so flush() can tell whether its own changes got through. */
  private failures = 0;
  /** Server paths whose last write failed: sent again (from the current copy here) the next time flush() runs. */
  private readonly unsaved = new Map<string, 'put' | 'delete'>();

  private queue: Promise<unknown> = Promise.resolve();
  /** Latest body per PUT path that has not been sent yet, so quick edits go out as one request. */
  private readonly unsent = new Map<string, { body: unknown }>();
  private loadedFor: string | null = null;

  constructor() {
    if (apiMode) {
      const auth = inject(AuthService);
      effect(() => {
        const userId = auth.user()?.id ?? null;
        untracked(() => this.onUserChanged(userId));
      });
      // Closing the tab while changes are still on their way would lose them.
      window.addEventListener('beforeunload', (e) => {
        if (this.syncing()) e.preventDefault();
      });
      return;
    }
    if (!local.get<boolean>('seeded', false)) {
      const learners = seedLearners();
      local.set('learners', learners);
      local.set('lessons', seedLessons());
      local.set('assessments', seedAssessments(learners));
      local.set('seeded', true);
      local.set('sampleHistory', true);
    } else if (!local.get<boolean>('sampleHistory', false)) {
      // Browsers that opened the preview before the charts existed get the sample history once.
      const learners = local.get<Learner[]>('learners', []);
      const level = new Map(learners.map((l) => [l.id, l.level]));
      const existing = local.get<Assessment[]>('assessments', []).map((a) => {
        // A sample learner who moved a level later was first placed at the earlier level.
        const m = /^asm_seed_p(\d+)$/.exec(a.id);
        const now = level.get(a.learnerId);
        return m && now ? { ...a, level: baselineLevel(Number(m[1]), now) as Level } : a;
      });
      const known = new Set(existing.map((a) => a.id));
      local.set('assessments', [...existing, ...historyFor(learners).filter((a) => !known.has(a.id))]);
      local.set('sampleHistory', true);
    }
    // The sample lesson made before subjects existed gets its subject (a teacher's own choice is kept).
    const saved = local.get<Lesson[]>('lessons', []);
    if (saved.some((l) => l.id === 'lsn_seed_mimi' && !l.subject)) {
      local.set('lessons', saved.map((l) => (l.id === 'lsn_seed_mimi' && !l.subject ? { ...l, subject: 'pagbasa' as const } : l)));
    }
    this.learners.set(local.get<Learner[]>('learners', []));
    this.lessons.set(local.get<Lesson[]>('lessons', []));
    this.assessments.set(local.get<Assessment[]>('assessments', []));
    this.units.set(local.get<Unit[]>('units', []));
    this.classes.set(previewClasses(this.learners()));
  }

  // ---------- Server (API mode) ----------

  private onUserChanged(userId: string | null): void {
    if (userId === this.loadedFor) return;
    this.loadedFor = userId;
    this.learners.set([]);
    this.lessons.set([]);
    this.assessments.set([]);
    this.units.set([]);
    this.classes.set([]);
    this.results.set([]);
    this.syncError.set('');
    this.ready.set(false);
    if (userId) void this.load();
  }

  /** Loads the signed-in teacher's center records. */
  async load(): Promise<void> {
    const userId = this.loadedFor;
    this.loadError.set('');
    this.ready.set(false);
    try {
      const d = await api.get<CenterData>('/data');
      if (userId !== this.loadedFor) return;
      this.learners.set(d.learners);
      this.lessons.set(d.lessons);
      this.units.set(d.units);
      this.assessments.set(d.assessments);
      this.classes.set(d.classes ?? []);
      this.results.set(d.results ?? []);
      this.settings.set(d.settings ?? { computerVoice: false });
      this.ready.set(true);
    } catch (err) {
      if (userId !== this.loadedFor || (err instanceof ApiError && err.status === 401)) return;
      this.loadError.set(err instanceof ApiError ? err.message : 'Your records could not be loaded. Try again.');
    }
  }

  private enqueue(run: () => Promise<unknown>, path: string, kind: 'put' | 'delete'): void {
    this.pending.update((n) => n + 1);
    this.queue = this.queue
      .then(run)
      .then(() => this.unsaved.delete(path))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
        this.failures++;
        this.unsaved.set(path, kind);
        const reason = err instanceof ApiError ? err.message : 'The server did not accept it.';
        this.syncError.set(`Your last change was not saved. ${reason}`);
      })
      .finally(() => this.pending.update((n) => n - 1));
  }

  /**
   * Resolves once every change made so far has reached the server (at once in the browser-only preview).
   * Changes the server refused earlier are sent again first, from this browser's current copy, so "Try again"
   * really retries. Throws a message for the teacher when something is still not accepted.
   */
  async flush(): Promise<void> {
    if (!apiMode) return;
    for (const [path, kind] of [...this.unsaved]) {
      this.unsaved.delete(path);
      if (kind === 'delete') this.remoteDelete(path);
      else {
        const copy = this.localCopy(path);
        if (copy) this.remotePut(path, copy);
      }
    }
    const before = this.failures;
    await this.queue;
    if (this.failures > before) throw new ProcessError(this.syncError() || 'Your change was not saved on the server.');
    this.syncError.set('');
  }

  /** The record a server path stands for, as it is now in this browser (undefined once deleted). */
  private localCopy(path: string): unknown {
    const [, kind, id] = path.split('/');
    switch (kind) {
      case 'units':
        return this.unit(id);
      case 'lessons':
        return this.lesson(id);
      case 'learners':
        return this.learner(id);
      case 'assessments':
        return this.assessments().find((a) => a.id === id);
      default:
        return undefined;
    }
  }

  /** Resolves when the signed-in teacher's records have loaded (at once in the browser-only preview). */
  async whenReady(timeoutMs = 20000): Promise<void> {
    const until = Date.now() + timeoutMs;
    while (!this.ready()) {
      if (this.loadError()) throw new ProcessError(this.loadError());
      if (Date.now() > until) throw new ProcessError('Your records are taking long to load. Check your internet and try again.');
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  private remotePut(path: string, body: unknown): void {
    if (!apiMode) return;
    const waiting = this.unsent.get(path);
    if (waiting) {
      waiting.body = body;
      return;
    }
    const entry = { body };
    this.unsent.set(path, entry);
    this.enqueue(
      async () => {
        // Skipped when the record was deleted (or deleted and made again) before this request went out.
        if (this.unsent.get(path) !== entry) return;
        this.unsent.delete(path);
        await api.put(path, entry.body);
      },
      path,
      'put',
    );
  }

  private remoteDelete(path: string): void {
    if (!apiMode) return;
    this.unsent.delete(path);
    this.unsaved.delete(path);
    // Already gone on the server (e.g. a retry after the answer was lost) counts as deleted.
    this.enqueue(() => api.delete(path).catch((err) => (err instanceof ApiError && err.status === 404 ? undefined : Promise.reject(err))), path, 'delete');
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
    this.remotePut(`/learners/${learner.id}`, learner);
    return learner;
  }

  updateLearner(learner: Learner): void {
    this.saveLearners(this.learners().map((l) => (l.id === learner.id ? learner : l)));
    this.remotePut(`/learners/${learner.id}`, learner);
  }

  /** Removes the child and their reading checks (the server removes the checks with the child). */
  removeLearner(id: string): void {
    this.saveLearners(this.learners().filter((l) => l.id !== id));
    this.saveAssessments(this.assessments().filter((a) => a.learnerId !== id));
    this.remoteDelete(`/learners/${id}`);
  }

  // ---------- Assessments ----------

  addAssessment(input: Omit<Assessment, 'id'>): Assessment {
    const assessment: Assessment = { ...input, id: uid('asm') };
    this.saveAssessments([...this.assessments(), assessment]);
    this.remotePut(`/assessments/${assessment.id}`, assessment);
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
      classIds: this.defaultClassIds(),
      createdAt: now,
      updatedAt: now,
    };
  }

  saveLesson(lesson: Lesson): void {
    const updated = { ...lesson, updatedAt: new Date().toISOString() };
    const exists = this.lessons().some((l) => l.id === lesson.id);
    this.saveLessons(exists ? this.lessons().map((l) => (l.id === lesson.id ? updated : l)) : [updated, ...this.lessons()]);
    this.remotePut(`/lessons/${lesson.id}`, updated);
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = this.lesson(id);
    this.saveLessons(this.lessons().filter((l) => l.id !== id));
    this.remoteDelete(`/lessons/${id}`);
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
      subject: info.subject,
      status: 'draft' as const,
      version: 1,
      assignedLevels: [info.level],
      classIds: this.defaultClassIds(),
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
    this.remotePut(`/units/${unit.id}`, unit);
    for (const l of lessons) this.remotePut(`/lessons/${l.id}`, l);
    return unit;
  }

  /** Puts a whole unit, and every lesson in it, in another subject world. */
  setUnitSubject(unitId: string, subject: SubjectKey): void {
    const unit = this.unit(unitId);
    if (!unit) return;
    const updated = { ...unit, subject };
    this.saveUnits(this.units().map((u) => (u.id === unitId ? updated : u)));
    this.remotePut(`/units/${unitId}`, updated);
    for (const l of this.unitLessons(unitId)) this.saveLesson({ ...l, subject });
  }

  /** Removes the unit and its lessons (the server removes the lessons with the unit). */
  async deleteUnit(id: string): Promise<void> {
    const lessons = this.unitLessons(id);
    this.saveLessons(this.lessons().filter((l) => l.unitId !== id));
    this.saveUnits(this.units().filter((u) => u.id !== id));
    for (const l of lessons) this.unsent.delete(`/lessons/${l.id}`);
    this.remoteDelete(`/units/${id}`);
    for (const l of lessons) await this.deleteMedia(l);
  }

  packChecks(lesson: Lesson): PackCheck[] {
    return checkLesson(lesson, this.packBytes(lesson));
  }

  /** "Ask your administrator": a teacher with no class asks for one (it shows on the administrator's dashboard). */
  async requestClass(): Promise<void> {
    const at = apiMode ? (await api.post<{ classRequestedAt: string }>('/classes/request', {})).classRequestedAt : new Date().toISOString();
    this.settings.update((s) => ({ ...s, classRequestedAt: at }));
  }

  /** The labelled computer voice for one page's text (only where the administrator allows it). */
  async computerVoice(text: string): Promise<Recording & { voice: 'computer' }> {
    const id = uid('aud');
    const r = await api.post<Recording & { voice: 'computer' }>(`/speech/${id}`, { text });
    return { audioId: r.audioId, audioBytes: r.audioBytes, audioSeconds: r.audioSeconds, voice: 'computer' };
  }

  /** A teacher with one class sends there by default; with several, they choose before publishing. */
  defaultClassIds(): string[] {
    const mine = this.classes().filter((c) => c.canSend);
    return mine.length === 1 ? [mine[0].id] : [];
  }

  /** Publishing locks a version. Editing a published lesson returns it to draft; publishing again makes the next version. */
  publish(lesson: Lesson, skipped: CheckKey[] = []): Lesson {
    const published: Lesson = {
      ...lesson,
      skippedChecks: skipped,
      status: 'published',
      version: lesson.publishedAt ? lesson.version + 1 : lesson.version,
      publishedAt: new Date().toISOString(),
    };
    this.saveLesson(published);
    return published;
  }

  /** Clears this browser's copies. With the API, the server's records are untouched. */
  resetAll(): void {
    local.clearAll();
    media.clearCache().catch(() => undefined);
  }

  // ---------- Persistence (with the API, records are kept on the server, not in this browser) ----------

  private saveLearners(v: Learner[]): void {
    this.learners.set(v);
    if (!apiMode) local.set('learners', v);
  }
  private saveLessons(v: Lesson[]): void {
    this.lessons.set(v);
    if (!apiMode) local.set('lessons', v);
  }
  private saveUnits(v: Unit[]): void {
    this.units.set(v);
    if (!apiMode) local.set('units', v);
  }
  private saveAssessments(v: Assessment[]): void {
    this.assessments.set(v);
    if (!apiMode) local.set('assessments', v);
  }
}
