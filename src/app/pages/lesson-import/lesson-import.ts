import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import {
  ParsedLesson,
  WORDS_PER_LESSON,
  countWords,
  parseLessonText,
  planUnit,
  suggestedLessonCount,
} from '../../core/lesson-import';
import { LANGUAGES, LEVELS, LEVEL_HINT, Level, PASS_MARK } from '../../core/models';
import { pdfToText } from '../../core/pdf-text';
import { Coach } from '../../shared/coach';

/**
 * Import a lesson file (WEB-06 extension): the portal reads the story, questions and answer key,
 * and sets them up as a unit of short lessons plus a checkpoint. The file never leaves this browser.
 */
@Component({
  selector: 'pl-lesson-import',
  imports: [FormsModule, RouterLink, Coach],
  templateUrl: './lesson-import.html',
  styleUrl: './lesson-import.scss',
})
export class LessonImport {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  readonly levels = LEVELS;
  readonly levelHint = LEVEL_HINT;
  readonly languages = LANGUAGES;
  readonly perLesson = WORDS_PER_LESSON;
  readonly passMark = PASS_MARK;
  readonly letters = 'ABCD';

  readonly mode = signal<'file' | 'paste'>('file');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly dragging = signal(false);
  readonly fileName = signal('');
  readonly pasted = signal('');

  readonly parsed = signal<ParsedLesson | null>(null);
  readonly title = signal('');
  readonly level = signal<Level>('Story');
  readonly language = signal<string>('Filipino');
  readonly count = signal(1);
  readonly suggested = signal(1);

  readonly totalWords = computed(() => this.parsed()?.paragraphs.reduce((s, p) => s + countWords(p), 0) ?? 0);
  readonly maxCount = computed(() => Math.min(6, this.parsed()?.paragraphs.length ?? 1));
  readonly counts = computed(() => Array.from({ length: this.maxCount() }, (_, i) => i + 1));
  readonly keyed = computed(() => this.parsed()?.questions.filter((q) => q.answer >= 0).length ?? 0);
  readonly plan = computed(() => {
    const p = this.parsed();
    return p ? planUnit(p, this.count(), this.title().trim() || p.title) : null;
  });
  readonly passNeeded = computed(() => Math.ceil((this.parsed()?.questions.length ?? 0) * PASS_MARK));
  readonly canCreate = computed(() => !!this.parsed()?.paragraphs.length && !!this.title().trim());

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.read(file);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.read(file);
  }

  async read(file: File): Promise<void> {
    this.error.set('');
    this.fileName.set(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isText = file.type.startsWith('text/') || /\.txt$/i.test(file.name);
    if (!isPdf && !isText) {
      this.error.set('Choose a PDF or a .txt file. For a Word file, save it as PDF first, or paste the text.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      this.error.set('That file is larger than 15 MB. Lesson files are usually under 1 MB.');
      return;
    }
    this.busy.set(true);
    try {
      const text = isPdf ? await pdfToText(file) : await file.text();
      if (!text.trim()) {
        this.error.set('No text could be read from this file. It may be a scanned picture of the page. Paste the text instead.');
        return;
      }
      this.useText(text);
    } catch (err) {
      console.error(err);
      this.error.set('This file could not be read. Try saving it again as PDF, or paste the text instead.');
    } finally {
      this.busy.set(false);
    }
  }

  readPasted(): void {
    this.error.set('');
    this.fileName.set('Pasted text');
    if (!this.pasted().trim()) {
      this.error.set('Paste the story and questions first.');
      return;
    }
    this.useText(this.pasted());
  }

  private useText(text: string): void {
    const parsed = parseLessonText(text);
    if (!parsed.paragraphs.length) {
      this.error.set(parsed.warnings[0] ?? 'No story text was found.');
      return;
    }
    const n = suggestedLessonCount(parsed.paragraphs);
    this.parsed.set(parsed);
    this.title.set(parsed.title);
    this.suggested.set(n);
    this.count.set(n);
  }

  reset(): void {
    this.parsed.set(null);
    this.fileName.set('');
    this.error.set('');
  }

  create(): void {
    const parsed = this.parsed();
    const plan = this.plan();
    if (!parsed || !plan || !this.canCreate()) return;
    const unit = this.data.createUnit(
      {
        title: this.title().trim(),
        author: parsed.author || undefined,
        level: this.level(),
        language: this.language(),
        sourceFile: this.fileName() || undefined,
        sourceLabel: parsed.label || undefined,
      },
      plan,
    );
    void this.router.navigate(['/app/lessons'], { queryParams: { unit: unit.id } });
  }

  excerpt(text: string, words = 14): string {
    const w = text.split(/\s+/);
    return w.length <= words ? text : `${w.slice(0, words).join(' ')}…`;
  }
}
