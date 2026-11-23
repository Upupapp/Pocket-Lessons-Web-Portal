import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, apiMode } from '../../core/api';
import { DataService } from '../../core/data.service';
import {
  Activity,
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
import { SUBJECTS, SubjectKey, isSubject, subjectOf } from '../../core/subjects';

@Component({
  selector: 'pl-lesson-editor',
  imports: [FormsModule, RouterLink, VoiceRecorder, MediaImage, LessonPreview],
  templateUrl: './lesson-editor.html',
  styleUrl: './lesson-editor.scss',
})
export class LessonEditor {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly processing = inject(Processing);

  readonly id = input.required<string>();
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
  readonly theme = computed(() => subjectOf(this.lesson()?.subject));
  readonly passNeeded = computed(() => Math.ceil((this.lesson()?.activities.length ?? 0) * PASS_MARK));
  readonly recordedQuestions = computed(() => this.lesson()?.activities.filter((a) => a.audioId).length ?? 0);
  readonly newWord = signal('');

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
    this.patchPage(index, rec);
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

  toggleLevel(level: Level): void {
    const set = new Set(this.lesson()!.assignedLevels);
    if (set.has(level)) set.delete(level);
    else set.add(level);
    this.patch({ assignedLevels: LEVELS.filter((l) => set.has(l)) });
  }

  setLevel(level: Level): void {
    const assigned = this.lesson()!.assignedLevels;
    this.patch({ level, assignedLevels: assigned.length <= 1 ? [level] : assigned });
  }

  // ---------- Save and publish ----------

  /** Publishing behind the loader: checked, packed, saved, then sent to the chosen reading levels. */
  async publish(event?: Event): Promise<void> {
    if (!this.ready()) return;
    this.flush();
    const l = this.lesson()!;
    let published: Lesson | undefined;
    await this.processing.run({
      title: 'Publishing the lesson',
      detail: l.title,
      from: event,
      steps: [
        { label: 'Checking the lesson', detail: `All ${plural(this.checks().length, 'check')} passed` },
        { label: 'Packing pages, pictures and your voice', detail: `${formatBytes(this.bytes())} of ${formatBytes(PACK_LIMIT_BYTES)} · ${plural(l.pages.length, 'page')}` },
        {
          label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser',
          run: () => {
            if (!published) {
              published = this.data.publish(this.lesson()!);
              this.lesson.set(structuredClone(published));
            }
            return this.data.flush();
          },
        },
        { label: 'Sending to reading levels', detail: l.assignedLevels.join(', ') },
      ],
      done: () => ({ title: `Published version ${published?.version ?? 1}`, detail: 'Families get it at their next hotspot visit or sync.' }),
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
