import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Activity, LANGUAGES, LEVELS, LEVEL_HINT, Lesson, LessonPage, Level, PACK_LIMIT_BYTES, formatBytes, uid } from '../../core/models';
import { media } from '../../core/storage';
import { MediaImage } from '../../shared/media-image';
import { shrinkPicture } from '../../shared/picture';
import { Recording, VoiceRecorder } from '../../shared/voice-recorder';
import { LessonPreview } from './lesson-preview';

@Component({
  selector: 'pl-lesson-editor',
  imports: [FormsModule, RouterLink, VoiceRecorder, MediaImage, LessonPreview],
  templateUrl: './lesson-editor.html',
  styleUrl: './lesson-editor.scss',
})
export class LessonEditor {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly levels = LEVELS;
  readonly levelHint = LEVEL_HINT;
  readonly languages = LANGUAGES;
  readonly limit = PACK_LIMIT_BYTES;
  readonly fmt = formatBytes;

  readonly lesson = signal<Lesson | null>(null);
  readonly notFound = signal(false);
  readonly saved = signal<'saved' | 'saving' | 'idle'>('idle');
  readonly toast = signal('');
  readonly previewOpen = signal(false);
  readonly pictureError = signal('');

  readonly bytes = computed(() => (this.lesson() ? this.data.packBytes(this.lesson()!) : 0));
  readonly checks = computed(() => (this.lesson() ? this.data.packChecks(this.lesson()!) : []));
  readonly ready = computed(() => this.checks().every((c) => c.ok));
  readonly percent = computed(() => Math.min(100, (this.bytes() / PACK_LIMIT_BYTES) * 100));
  readonly recordedPages = computed(() => this.lesson()?.pages.filter((p) => p.audioId).length ?? 0);
  readonly voiceSeconds = computed(() => this.lesson()?.pages.reduce((s, p) => s + (p.audioSeconds ?? 0), 0) ?? 0);

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
    try {
      const blob = await shrinkPicture(file);
      const id = uid('img');
      await media.put(id, blob);
      const old = this.lesson()!.pages[index].pictureId;
      if (old) await media.delete(old).catch(() => undefined);
      this.patchPage(index, { pictureId: id, pictureBytes: blob.size });
    } catch {
      this.pictureError.set('That file could not be used as a picture. Try a JPG or PNG.');
    }
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

  patchActivity(index: number, changes: Partial<Activity>): void {
    this.patch({ activities: this.lesson()!.activities.map((a, i) => (i === index ? { ...a, ...changes } : a)) });
  }

  setChoice(index: number, choice: number, value: string): void {
    const a = this.lesson()!.activities[index];
    this.patchActivity(index, { choices: a.choices.map((c, i) => (i === choice ? value : c)) });
  }

  removeActivity(index: number): void {
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

  publish(): void {
    if (!this.ready()) return;
    this.flush();
    const published = this.data.publish(this.lesson()!);
    this.lesson.set(structuredClone(published));
    this.flash(`Published version ${published.version}. Families get it at their next hotspot visit or sync.`);
  }

  async deleteLesson(): Promise<void> {
    const l = this.lesson();
    if (!l || !confirm(`Delete "${l.title || 'Untitled lesson'}"? This cannot be undone.`)) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (this.persisted) await this.data.deleteLesson(l.id);
    else for (const p of l.pages) {
      if (p.audioId) await media.delete(p.audioId).catch(() => undefined);
      if (p.pictureId) await media.delete(p.pictureId).catch(() => undefined);
    }
    void this.router.navigateByUrl('/app/lessons');
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

  private flash(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 5000);
  }
}
