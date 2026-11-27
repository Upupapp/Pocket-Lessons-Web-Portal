import { Component, DestroyRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, apiMode } from '../../core/api';
import { DataService } from '../../core/data.service';
import {
  Activity,
  Block,
  LANGUAGES,
  LEVELS,
  LEVEL_HINT,
  Lesson,
  LessonPage,
  Level,
  MAX_CHOICES,
  MIN_CHOICES,
  PACK_LIMIT_BYTES,
  PASS_MARK,
  formatBytes,
  plural,
  uid,
} from '../../core/models';
import { Processing } from '../../core/processing';
import { media } from '../../core/storage';
import { MediaImage } from '../../shared/media-image';
import { shrinkPicture } from '../../shared/picture';
import { Recording, VoiceRecorder } from '../../shared/voice-recorder';
import { LessonPreview } from './lesson-preview';
import { BlockEditor } from './block-editor';
import { blocksText } from '../../core/math-import';
import { SUBJECTS, SubjectKey, isSubject, subjectOf } from '../../core/subjects';
import { CHECK_LABELS, CheckKey, IF_SKIPPED, Issue, failingChecks, lessonIssues, suggestQuestions, suggestSubject, suggestTitle } from '../../core/lesson-checks';
import { FormDialog } from '../../shared/form-dialog';
import { MissingPanel, PublishState, UnitRow } from './missing-panel';
import { RecordAll } from './record-all';

@Component({
  selector: 'pl-lesson-editor',
  imports: [FormsModule, DatePipe, RouterLink, VoiceRecorder, MediaImage, LessonPreview, MissingPanel, RecordAll, FormDialog, BlockEditor],
  templateUrl: './lesson-editor.html',
  styleUrl: './lesson-editor.scss',
  // While the "What's missing" panel is open on a wide screen, the editor moves aside so nothing is hidden under it.
  host: { '[class.with-panel]': 'panelOpen()' },
})
export class LessonEditor {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly processing = inject(Processing);

  readonly id = input.required<string>();
  /** From "Whole unit" in another lesson's panel: the part to jump to once this lesson opens. */
  readonly jump = input('');
  readonly jumpFocus = input('', { alias: 'focus' });
  readonly levels = LEVELS;
  readonly levelHint = LEVEL_HINT;
  readonly languages = LANGUAGES;
  readonly limit = PACK_LIMIT_BYTES;
  readonly fmt = formatBytes;
  readonly minChoices = MIN_CHOICES;
  readonly maxChoices = MAX_CHOICES;
  readonly letters = 'ABCD';
  readonly subjects = SUBJECTS;

  readonly lesson = signal<Lesson | null>(null);
  readonly notFound = signal(false);
  readonly saved = signal<'saved' | 'saving' | 'idle'>('idle');
  readonly savedText = computed(() => {
    const s = this.saved();
    if (s === 'saving' || (s === 'saved' && this.data.syncing())) return 'Saving…';
    return s === 'saved' ? (apiMode ? 'Saved' : 'Saved in this browser') : '';
  });
  readonly previewOpen = signal(false);
  readonly pictureError = signal('');

  readonly bytes = computed(() => (this.lesson() ? this.data.packBytes(this.lesson()!) : 0));
  readonly checks = computed(() => (this.lesson() ? this.data.packChecks(this.lesson()!) : []));
  readonly ready = computed(() => this.checks().every((c) => c.ok));
  readonly percent = computed(() => Math.min(100, (this.bytes() / PACK_LIMIT_BYTES) * 100));
  readonly recordedPages = computed(() => this.lesson()?.pages.filter((p) => p.audioId).length ?? 0);
  readonly voiceSeconds = computed(() => {
    const l = this.lesson();
    if (!l) return 0;
    return l.pages.reduce((s, p) => s + (p.audioSeconds ?? 0), 0) + l.activities.reduce((s, a) => s + (a.audioSeconds ?? 0), 0);
  });

  // ---------- Unit context ----------
  readonly unit = computed(() => {
    const id = this.lesson()?.unitId;
    return id ? this.data.unit(id) : undefined;
  });
  readonly path = computed(() => {
    const l = this.lesson();
    const u = this.unit();
    if (!l || !u) return [];
    return this.data.unitLessons(u.id).map((x) => (x.id === l.id ? l : x));
  });
  readonly position = computed(() => this.path().findIndex((x) => x.id === this.lesson()?.id));
  readonly prevLesson = computed(() => this.path()[this.position() - 1]);
  readonly nextLesson = computed(() => this.path()[this.position() + 1]);
  readonly isCheckpoint = computed(() => this.lesson()?.kind === 'checkpoint');
  /** A Math lesson: its numbered activities are inside the pages. */
  readonly hasSets = computed(() => !!this.lesson()?.pages.some((p) => p.blocks?.some((b) => b.type === 'set')));
  readonly theme = computed(() => subjectOf(this.lesson()?.subject));
  readonly passNeeded = computed(() => Math.ceil((this.lesson()?.activities.length ?? 0) * PASS_MARK));
  readonly recordedQuestions = computed(() => this.lesson()?.activities.filter((a) => a.audioId).length ?? 0);
  readonly newWord = signal('');

  // ---------- What's missing ----------
  private readonly panel = viewChild(MissingPanel);
  readonly settings = this.data.settings;
  readonly issues = computed(() => (this.lesson() ? lessonIssues(this.lesson()!, this.bytes(), this.sendable().length > 0) : []));
  readonly requiredMissing = computed(() => this.issues().filter((i) => i.required).length);
  readonly publishState = computed<PublishState>(() => {
    const l = this.lesson();
    if (!l || l.status === 'published') return 'published';
    if (this.ready()) return 'ready';
    return this.requiredMissing() ? 'blocked' : 'anyway';
  });
  readonly titleSuggestion = computed(() => (this.lesson() ? suggestTitle(this.lesson()!, this.unit()?.title) : ''));
  readonly subjectSuggestion = computed(() => (this.lesson() ? suggestSubject(this.lesson()!, this.unit()?.title ?? '') : 'general'));
  readonly subjectSuggestionName = computed(() => subjectOf(this.subjectSuggestion()).childEn);
  readonly unitRows = computed<UnitRow[]>(() => {
    const cur = this.lesson();
    if (!cur || !this.unit()) return [];
    return this.path().map((x, i) => ({
      id: x.id,
      title: x.title,
      label: x.kind === 'checkpoint' ? 'Checkpoint' : `Part ${i + 1}`,
      published: x.status === 'published',
      current: x.id === cur.id,
      issues: lessonIssues(x, this.data.packBytes(x), this.sendable().length > 0),
    }));
  });
  readonly undoText = signal('');
  readonly panelOpen = signal(false);
  readonly recordAllOpen = signal(false);
  readonly recordAllStart = signal(0);
  readonly anywayOpen = signal(false);
  /** What "Publish anyway" will leave out, with what the child gets. */
  readonly skipList = computed(() => {
    const l = this.lesson();
    if (!l) return [];
    return failingChecks(l, this.bytes()).map((key) => ({
      key,
      label: CHECK_LABELS[key],
      count: this.issues().filter((i) => i.check === key).length,
      effect: IF_SKIPPED[key],
    }));
  });
  private undoFn?: () => void;
  private pendingDelete: string[] = [];
  private undoTimer?: ReturnType<typeof setTimeout>;

  private saveTimer?: ReturnType<typeof setTimeout>;
  private persisted = false;

  constructor() {
    effect(() => {
      const id = this.id();
      if (id === 'new') {
        this.lesson.set(this.data.newLesson());
        this.persisted = false;
        this.notFound.set(false);
      } else {
        // untracked: reload only when the route id changes, not on every save
        if (this.saveTimer) {
          clearTimeout(this.saveTimer);
          this.flush();
        }
        const found = untracked(() => this.data.lesson(id));
        this.lesson.set(found ? structuredClone(found) : null);
        this.persisted = !!found;
        this.notFound.set(!found);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.flush();
      }
      this.finishUndo();
    });
    // Opened from "Whole unit" in another lesson: jump to the part once the page is drawn.
    effect(() => {
      const target = this.jump();
      if (!target || !this.lesson()) return;
      const focus = this.jumpFocus() || undefined;
      untracked(() => {
        setTimeout(() => {
          this.jumpTo({ target, focus });
          void this.router.navigate([], { queryParams: {}, replaceUrl: true });
        }, 350);
      });
    });
  }

  // ---------- What's missing: show me ----------

  /** Scrolls the part to the middle of the screen, makes it glow for a moment and puts the cursor in it. */
  jumpTo(where: { target: string; focus?: string }): void {
    const el = document.getElementById(where.target);
    if (!el) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('jump-glow');
    void el.offsetWidth; // restart the glow when the same part is shown twice
    el.classList.add('jump-glow');
    setTimeout(() => el.classList.remove('jump-glow'), 2200);
    const f = where.focus && !el.matches(where.focus) ? el.querySelector<HTMLElement>(where.focus) : el;
    setTimeout(() => f?.focus({ preventScroll: true }), still ? 0 : 450);
  }

  openPanel(): void {
    this.panel()?.toggle(true);
  }

  openOtherLesson(e: { lessonId: string; issue: Issue }): void {
    void this.router.navigate(['/app/lessons', e.lessonId], { queryParams: { jump: e.issue.target, focus: e.issue.focus ?? null } });
  }

  // ---------- What's missing: fix it ----------

  async fix(i: Issue, event?: Event): Promise<void> {
    switch (i.fix) {
      case 'title':
        this.patch({ title: this.titleSuggestion() });
        return;
      case 'subject':
        this.setSubject(this.subjectSuggestion());
        return;
      case 'remove-page':
        this.removeWithUndo('page', i.index ?? 0);
        return;
      case 'remove-question':
        this.removeWithUndo('question', i.index ?? 0);
        return;
      case 'accept-question':
        this.patchActivity(i.index ?? 0, { auto: false });
        return;
      case 'record-all': {
        const first = this.lesson()!.pages.findIndex((p) => !p.audioId || p.voice === 'computer');
        this.recordAllStart.set(first < 0 ? 0 : first);
        this.recordAllOpen.set(true);
        return;
      }
      case 'suggest':
        this.suggest();
        return;
      case 'ask-admin':
        await this.processing.run({
          title: 'Asking your administrator for a class',
          from: event,
          quick: true,
          run: () => this.data.requestClass(),
          done: { title: 'Your administrator has been asked', detail: 'Once you have a class, tick it under Send to classes.' },
        });
        return;
      case 'lighter':
        await this.makeLighter(event);
        return;
    }
  }

  /** Removes a page or question at once, with Undo for 10 seconds (its files are deleted only after that). */
  private removeWithUndo(kind: 'page' | 'question', index: number): void {
    this.finishUndo();
    const l = this.lesson()!;
    if (kind === 'page') {
      const page = l.pages[index];
      this.patch({ pages: l.pages.filter((_, i) => i !== index) });
      this.pendingDelete = [page.audioId, page.pictureId].filter((x): x is string => !!x);
      this.undoFn = () => {
        const pages = [...this.lesson()!.pages];
        pages.splice(index, 0, page);
        this.patch({ pages });
      };
      this.undoText.set(`Page ${index + 1} removed.`);
    } else {
      const a = l.activities[index];
      this.patch({ activities: l.activities.filter((_, i) => i !== index) });
      this.pendingDelete = a.audioId ? [a.audioId] : [];
      this.undoFn = () => {
        const list = [...this.lesson()!.activities];
        list.splice(index, 0, a);
        this.patch({ activities: list });
      };
      this.undoText.set(`${this.isCheckpoint() ? 'Question' : 'Activity'} ${index + 1} removed.`);
    }
    this.undoTimer = setTimeout(() => this.finishUndo(), 10_000);
  }

  undo(): void {
    clearTimeout(this.undoTimer);
    this.undoFn?.();
    this.undoFn = undefined;
    this.pendingDelete = [];
    this.undoText.set('');
  }

  private finishUndo(): void {
    clearTimeout(this.undoTimer);
    for (const id of this.pendingDelete) void media.delete(id).catch(() => undefined);
    this.pendingDelete = [];
    this.undoFn = undefined;
    this.undoText.set('');
  }

  /** Draft checkpoint questions from the unit's story (or this lesson's pages); the teacher checks each one. */
  suggest(): void {
    const l = this.lesson()!;
    const source = this.unit() ? this.path().filter((x) => x.kind !== 'checkpoint') : [l];
    const texts = source.flatMap((x) => x.pages.map((p) => p.text));
    const made = suggestQuestions(texts);
    if (!made.length) {
      this.undoText.set('There is not enough story text to suggest questions. Add them with + Add question.');
      return;
    }
    this.patch({ activities: [...l.activities, ...made] });
    this.undoText.set(`${made.length} questions suggested. Check each one, then tap “Looks right”.`);
    setTimeout(() => this.jumpTo({ target: `act-${made[0].id}` }), 120);
  }

  /** Shrinks large pictures again (recordings are already small: about 16 kbps). */
  private async makeLighter(event?: Event): Promise<void> {
    const before = this.bytes();
    await this.processing.run({
      title: 'Making the lesson lighter',
      detail: 'Shrinking the pictures',
      from: event,
      run: async () => {
        const pages = this.lesson()!.pages;
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i];
          if (!p.pictureId || (p.pictureBytes ?? 0) < 60_000) continue;
          const blob = await media.get(p.pictureId);
          if (!blob) continue;
          const smaller = await shrinkPicture(new File([blob], 'picture', { type: blob.type || 'image/jpeg' }), 560, 0.6);
          if (smaller.size >= blob.size * 0.9) continue;
          const id = uid('img');
          await media.put(id, smaller);
          const old = p.pictureId;
          this.patchPage(i, { pictureId: id, pictureBytes: smaller.size });
          await media.delete(old).catch(() => undefined);
        }
      },
      done: () => ({ title: `${formatBytes(before)} → ${formatBytes(this.bytes())}`, detail: 'Pictures shrunk. Recordings are already compressed when you record.' }),
    });
  }

  /** The labelled computer voice for one page (only where the administrator allows it). */
  async computerVoice(e: { issue: Issue }, event?: Event): Promise<void> {
    await this.speakPages([e.issue.index ?? 0], event);
  }

  async computerVoiceAll(event?: Event): Promise<void> {
    const idx = this.lesson()!.pages.map((p, i) => (!p.audioId && p.text.trim() ? i : -1)).filter((i) => i >= 0);
    await this.speakPages(idx, event);
  }

  private async speakPages(indexes: number[], event?: Event): Promise<void> {
    const pages = this.lesson()!.pages;
    const todo = indexes.filter((i) => pages[i]?.text.trim());
    if (!todo.length) {
      this.undoText.set('A page needs words before the computer voice can read it.');
      return;
    }
    await this.processing.run({
      title: 'Making the computer voice',
      detail: `${plural(todo.length, 'page')} · labelled “Computer voice” until you record your own`,
      from: event,
      run: async () => {
        for (const i of todo) {
          const rec = await this.data.computerVoice(this.lesson()!.pages[i].text);
          this.patchPage(i, rec);
        }
      },
      done: { title: 'Computer voice added', detail: 'Record your own voice any time: it replaces the computer voice.' },
    });
  }

  // ---------- Editing ----------

  /**
   * The subject world. In a unit it changes every lesson of the unit, so a story stays in one world.
   * It only changes where the lesson is shown, so a published lesson stays published.
   */
  setSubject(key: string): void {
    const current = this.lesson();
    if (!current || !isSubject(key)) return;
    this.lesson.set({ ...current, subject: key as SubjectKey });
    const inUnit = !!current.unitId && !!this.unit();
    if (inUnit) this.data.setUnitSubject(current.unitId!, key as SubjectKey);
    this.flush();
    const world = subjectOf(key);
    // A quick save: the loader only shows if the server takes a moment.
    void this.processing.run({
      title: `Moving to the ${world.childEn} world`,
      detail: inUnit ? `All ${plural(this.path().length, 'lesson')} in this unit` : current.title || 'This lesson',
      quick: true,
      run: () => this.data.flush(),
      done: { title: `Now in the ${world.childEn} world`, detail: world.world },
    });
  }

  patch(changes: Partial<Lesson>): void {
    const current = this.lesson();
    if (!current) return;
    // Editing a published lesson starts a new draft version; families keep the published one until you publish again.
    this.lesson.set({ ...current, ...changes, status: 'draft' });
    this.scheduleSave();
  }

  /** A page built from blocks: its plain text follows the blocks (for the checks and the computer voice). */
  patchBlocks(index: number, blocks: Block[]): void {
    this.patchPage(index, { blocks, text: blocksText(blocks) });
  }

  patchPage(index: number, changes: Partial<LessonPage>): void {
    const pages = this.lesson()!.pages.map((p, i) => (i === index ? { ...p, ...changes } : p));
    this.patch({ pages });
  }

  addPage(): void {
    this.patch({ pages: [...this.lesson()!.pages, { id: uid('pg'), text: '' }] });
  }

  movePage(index: number, delta: -1 | 1): void {
    const pages = [...this.lesson()!.pages];
    const target = index + delta;
    if (target < 0 || target >= pages.length) return;
    [pages[index], pages[target]] = [pages[target], pages[index]];
    this.patch({ pages });
  }

  async removePage(index: number): Promise<void> {
    const page = this.lesson()!.pages[index];
    if ((page.text || page.audioId) && !confirm(`Delete page ${index + 1}? Its text, picture and recording will be removed.`)) return;
    if (page.audioId) await media.delete(page.audioId).catch(() => undefined);
    if (page.pictureId) await media.delete(page.pictureId).catch(() => undefined);
    this.patch({ pages: this.lesson()!.pages.filter((_, i) => i !== index) });
  }

  onRecorded(index: number, rec: Recording): void {
    // The teacher's own voice replaces a computer voice.
    this.patchPage(index, { ...rec, voice: undefined });
  }

  onRecordingRemoved(index: number): void {
    this.patchPage(index, { audioId: undefined, audioBytes: undefined, audioSeconds: undefined });
  }

  async onPicture(index: number, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    this.pictureError.set('');
    // A quick save: the loader only shows if shrinking or storing the picture takes a moment.
    const r = await this.processing.run({
      title: 'Adding the picture',
      detail: `Page ${index + 1} · ${file.name}`,
      from: (event.target as HTMLElement).closest('label'),
      quick: true,
      errors: 'inline',
      run: async () => {
        const blob = await shrinkPicture(file);
        const id = uid('img');
        await media.put(id, blob);
        const old = this.lesson()!.pages[index].pictureId;
        if (old) await media.delete(old).catch(() => undefined);
        this.patchPage(index, { pictureId: id, pictureBytes: blob.size });
      },
      errorText: (err) =>
        err instanceof ApiError ? `The picture was not saved. ${err.message}` : 'That file could not be used as a picture. Try a JPG or PNG.',
    });
    if (!r.ok) this.pictureError.set(r.error);
  }

  async removePicture(index: number): Promise<void> {
    const id = this.lesson()!.pages[index].pictureId;
    if (id) await media.delete(id).catch(() => undefined);
    this.patchPage(index, { pictureId: undefined, pictureBytes: undefined });
  }

  addActivity(): void {
    const activity: Activity = { id: uid('act'), prompt: '', choices: ['', '', ''], answer: 0 };
    this.patch({ activities: [...this.lesson()!.activities, activity] });
  }

  addChoice(index: number): void {
    const a = this.lesson()!.activities[index];
    if (a.choices.length >= MAX_CHOICES) return;
    this.patchActivity(index, { choices: [...a.choices, ''] });
  }

  removeChoice(index: number, choice: number): void {
    const a = this.lesson()!.activities[index];
    if (a.choices.length <= MIN_CHOICES) return;
    const answer = choice === a.answer ? 0 : choice < a.answer ? a.answer - 1 : a.answer;
    this.patchActivity(index, { choices: a.choices.filter((_, i) => i !== choice), answer });
  }

  onQuestionRecorded(index: number, rec: Recording): void {
    this.patchActivity(index, rec);
  }

  onQuestionRecordingRemoved(index: number): void {
    this.patchActivity(index, { audioId: undefined, audioBytes: undefined, audioSeconds: undefined });
  }

  moveActivity(index: number, delta: -1 | 1): void {
    const list = [...this.lesson()!.activities];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.patch({ activities: list });
  }

  addReviewWord(): void {
    const word = this.newWord().trim().toLowerCase();
    const words = this.lesson()!.reviewWords ?? [];
    this.newWord.set('');
    if (!word || words.includes(word) || words.length >= 8) return;
    this.patch({ reviewWords: [...words, word] });
  }

  removeReviewWord(word: string): void {
    this.patch({ reviewWords: (this.lesson()!.reviewWords ?? []).filter((w) => w !== word) });
  }

  patchActivity(index: number, changes: Partial<Activity>): void {
    this.patch({ activities: this.lesson()!.activities.map((a, i) => (i === index ? { ...a, ...changes } : a)) });
  }

  setChoice(index: number, choice: number, value: string): void {
    const a = this.lesson()!.activities[index];
    this.patchActivity(index, { choices: a.choices.map((c, i) => (i === choice ? value : c)) });
  }

  async removeActivity(index: number): Promise<void> {
    const a = this.lesson()!.activities[index];
    if (a.prompt.trim() && !confirm(`Remove activity ${index + 1}?`)) return;
    if (a.audioId) await media.delete(a.audioId).catch(() => undefined);
    this.patch({ activities: this.lesson()!.activities.filter((_, i) => i !== index) });
  }

  /** The classes this teacher can send to (their own; administrators can choose any). */
  readonly sendable = computed(() => this.data.classes().filter((c) => c.canSend));
  /** Classes already on the lesson that this teacher cannot change (a colleague's), shown read-only. */
  readonly othersOnLesson = computed(() => {
    const ids = this.lesson()?.classIds ?? [];
    return this.data.classes().filter((c) => !c.canSend && ids.includes(c.id));
  });
  readonly classNames = computed(() => {
    const ids = this.lesson()?.classIds ?? [];
    return this.data
      .classes()
      .filter((c) => ids.includes(c.id))
      .map((c) => c.name)
      .join(', ');
  });

  toggleClass(id: string): void {
    const set = new Set(this.lesson()!.classIds ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.patch({ classIds: this.data.classes().map((c) => c.id).filter((c) => set.has(c)) });
  }

  /** The reading level is a label on the lesson; who gets it is decided by class. */
  setLevel(level: Level): void {
    this.patch({ level, assignedLevels: [level] });
  }

  // ---------- Save and publish ----------

  /** "Publish anyway": first the pop-up that says what is left out and what the child gets. */
  askPublishAnyway(): void {
    if (this.publishState() === 'anyway') this.anywayOpen.set(true);
  }

  /**
   * Publishing behind the loader: checked, packed, saved, then sent to the chosen classes.
   * `skipped`: the parts left for later ("Publish anyway"); never a required one (the server refuses those too).
   */
  async publish(event?: Event, skipped: CheckKey[] = []): Promise<void> {
    if (!this.ready() && (!skipped.length || this.requiredMissing())) return;
    this.anywayOpen.set(false);
    this.flush();
    const l = this.lesson()!;
    let published: Lesson | undefined;
    await this.processing.run({
      title: skipped.length ? 'Publishing the lesson anyway' : 'Publishing the lesson',
      detail: l.title,
      from: event,
      steps: [
        {
          label: 'Checking the lesson',
          detail: skipped.length ? `${plural(skipped.length, 'check')} left for later` : `All ${plural(this.checks().length, 'check')} passed`,
        },
        { label: 'Packing pages, pictures and your voice', detail: `${formatBytes(this.bytes())} of ${formatBytes(PACK_LIMIT_BYTES)} · ${plural(l.pages.length, 'page')}` },
        {
          label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser',
          run: () => {
            if (!published) {
              published = this.data.publish(this.lesson()!, skipped);
              this.lesson.set(structuredClone(published));
            }
            return this.data.flush();
          },
        },
        { label: 'Sending to classes', detail: this.classNames() },
      ],
      done: () => ({
        title: `Published version ${published?.version ?? 1}${skipped.length ? ' · some parts left for later' : ''}`,
        detail: `Children in ${this.classNames() || 'the chosen classes'} get it on their family phones at the next check-in.`,
      }),
    });
  }

  /** Publishes every part of the unit that has nothing needed missing, in order, leaving the rest for later. */
  async publishUnit(event?: Event): Promise<void> {
    this.flush();
    const cur = this.lesson()!;
    const parts = this.path().map((x) => (x.id === cur.id ? cur : x));
    const done: string[] = [];
    const notDone: string[] = [];
    let ran = false;
    await this.processing.run({
      title: 'Publishing the whole unit',
      detail: this.unit()?.title ?? '',
      from: event,
      steps: [
        {
          label: 'Checking and publishing each part',
          run: () => {
            if (ran) return;
            ran = true;
            parts.forEach((x, i) => {
              const label = x.kind === 'checkpoint' ? 'Checkpoint' : `Part ${i + 1}`;
              if (x.status === 'published') return void done.push(label);
              const bytes = this.data.packBytes(x);
              const needed = lessonIssues(x, bytes, this.sendable().length > 0).filter((p) => p.required);
              if (needed.length) return void notDone.push(`${label} (${needed[0].what.toLowerCase()})`);
              const published = this.data.publish(x, failingChecks(x, bytes));
              if (x.id === cur.id) this.lesson.set(structuredClone(published));
              done.push(label);
            });
          },
        },
        { label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser', run: () => this.data.flush() },
      ],
      done: () => ({
        title: `${done.length} of ${parts.length} parts published`,
        detail: notDone.length ? `Not yet: ${notDone.join(', ')}.` : 'Every part of the unit is published.',
      }),
    });
  }

  async deleteLesson(event?: Event): Promise<void> {
    const l = this.lesson();
    if (!l || !confirm(`Delete "${l.title || 'Untitled lesson'}"? This cannot be undone.`)) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    const name = l.title || 'Untitled lesson';
    let removed = false;
    await this.processing.run({
      title: 'Deleting the lesson',
      detail: name,
      from: event,
      steps: [
        {
          label: 'Removing its pages, pictures and recordings',
          run: async () => {
            if (removed) return;
            removed = true;
            if (this.persisted) await this.data.deleteLesson(l.id);
            else await this.data.deleteMedia(l);
          },
        },
        { label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser', run: () => this.data.flush() },
        { label: 'Back to your lessons', run: () => this.router.navigateByUrl('/app/lessons') },
      ],
      done: { title: 'Lesson deleted', detail: name },
    });
  }

  private scheduleSave(): void {
    this.saved.set('saving');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 500);
  }

  private flush(): void {
    this.saveTimer = undefined;
    const l = this.lesson();
    if (!l) return;
    this.data.saveLesson(l);
    this.saved.set('saved');
    if (!this.persisted) {
      this.persisted = true;
      void this.router.navigate(['/app/lessons', l.id], { replaceUrl: true });
    }
  }
}
