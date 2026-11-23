import { Component, ElementRef, afterNextRender, computed, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportDraftData } from '../core/import-draft';
import { parseLessonText } from '../core/lesson-import';
import { pdfToText } from '../core/pdf-text';
import { SubjectKey, subjectIcon, subjectOf } from '../core/subjects';
import { SubjectPicker } from './subject-picker';

/**
 * Importing a lesson file, in two centred pop-ups: first the subject (so the lessons get the right
 * world), then the file. Either can be closed; Back returns from the file to the subject.
 */
@Component({
  selector: 'pl-import-dialog',
  imports: [FormsModule, SubjectPicker],
  template: `
    <dialog #dlg class="dlg" [attr.aria-labelledby]="step() === 'subject' ? 'imp-subject-title' : 'imp-file-title'" (cancel)="$event.preventDefault(); close()" (click)="backdrop($event)">
      <div class="panel" [class.wide]="step() === 'subject'">
        <button type="button" class="x" (click)="close()" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>

        @if (step() === 'subject') {
          <p class="step">Step 1 of 2</p>
          <h2 id="imp-subject-title">Which subject is this lesson for?</h2>
          <p class="lead">The lessons will show in this subject's world on the children's phones, with its colours and pictures.</p>
          <pl-subject-picker [value]="subject()" label="Subject of the lesson file" (picked)="subject.set($event)" />
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="!subject()" (click)="step.set('file')">Next: choose the file</button>
          </div>
        } @else {
          <p class="step">Step 2 of 2</p>
          <h2 id="imp-file-title">Upload the lesson file</h2>
          @if (theme(); as t) {
            <p class="chosen-row">
              <span class="chosen" [style.--main]="t.main" [style.--tint]="t.tint" [style.--deep]="t.deep">
                <img [src]="icon(t.hero)" alt="" width="20" height="20" />{{ t.childEn }} · {{ t.world }}
              </span>
              <button type="button" class="link" (click)="step.set('subject')">Change subject</button>
            </p>
          }
          <div class="tabs" role="tablist" aria-label="How to add the lesson">
            <button type="button" role="tab" [attr.aria-selected]="mode() === 'file'" [class.on]="mode() === 'file'" (click)="mode.set('file')">Upload a file</button>
            <button type="button" role="tab" [attr.aria-selected]="mode() === 'paste'" [class.on]="mode() === 'paste'" (click)="mode.set('paste')">Paste the text</button>
          </div>

          @if (mode() === 'file') {
            <label
              class="drop"
              [class.over]="dragging()"
              [class.busy]="busy()"
              (dragover)="$event.preventDefault(); dragging.set(true)"
              (dragleave)="dragging.set(false)"
              (drop)="onDrop($event)"
            >
              <input type="file" accept=".pdf,.txt,application/pdf,text/plain" class="sr-only" (change)="onFile($event)" [disabled]="busy()" />
              @if (theme(); as t) { <img class="hero" [src]="icon(t.hero)" alt="" width="64" height="64" /> }
              @if (busy()) {
                <strong>Reading {{ fileName() }}…</strong>
                <span class="muted small">This takes a few seconds.</span>
              } @else {
                <strong>Drop the lesson PDF here, or click to choose it</strong>
                <span class="muted small">PDF or .txt · read in this browser, nothing is uploaded</span>
              }
            </label>
          } @else {
            <label class="field">
              <span>Paste the story, the questions and the answer key</span>
              <textarea class="textarea paste" [ngModel]="pasted()" (ngModelChange)="pasted.set($event)" rows="9"
                placeholder="Story&#10;HATING KAPATID&#10;(Author)&#10;&#10;First paragraph…&#10;&#10;Comprehension Questions&#10;1. Question?&#10;A) …&#10;B) …&#10;&#10;Key to Correction&#10;1. B"></textarea>
              <span class="hint">Leave a blank line between paragraphs.</span>
            </label>
          }
          @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
          <p class="small muted finds">The portal looks for the <strong>Story</strong> (title, author, paragraphs), <strong>Comprehension Questions</strong> with A to D choices, and the <strong>Key to Correction</strong>, as in the AHA lesson template.</p>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="step.set('subject')">Back</button>
            @if (mode() === 'paste') { <button type="button" class="btn btn-primary" (click)="readPasted()">Read the text</button> }
          </div>
        }
      </div>
    </dialog>
  `,
  styles: `
    .dlg {
      border: 0; padding: 0; background: transparent; max-width: none; max-height: none; width: 100%; height: 100%;
      display: grid; place-items: center; overflow: auto;
    }
    .dlg:not([open]) { display: none; }
    .dlg::backdrop { background: rgba(20, 27, 24, .45); backdrop-filter: blur(2px); }
    .panel {
      position: relative; width: min(560px, calc(100% - 32px)); margin: 24px auto; padding: 26px 26px 22px; border-radius: 18px;
      background: #fff; color: var(--ink); box-shadow: 0 24px 60px -20px rgba(0, 0, 0, .45); display: grid; gap: 14px;
      animation: pop .22s cubic-bezier(.2, .8, .2, 1) both;
    }
    .panel.wide { width: min(760px, calc(100% - 32px)); }
    .x { position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: #fff; color: var(--muted); display: grid; place-items: center; cursor: pointer; }
    .x:hover { color: var(--ink); border-color: var(--line-strong); }
    .step { font-size: 12.5px; font-weight: 700; color: var(--muted); }
    h2 { font-family: var(--serif); font-size: 24px; color: var(--title); margin: -6px 0 0; padding-right: 40px; }
    .lead { color: var(--muted); font-size: 14.5px; margin-top: -4px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
    .chosen-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: -4px; }
    .chosen {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; border-radius: 999px; font-size: 13px; font-weight: 700;
      background: var(--tint); color: var(--deep); border: 1px solid color-mix(in srgb, var(--main) 35%, white);
    }
    .link { background: none; border: 0; padding: 4px; color: var(--accent); font: 700 13.5px var(--font); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
    .tabs { display: inline-flex; justify-self: start; background: var(--cream-2); border-radius: 999px; padding: 4px; }
    .tabs button { border: 0; background: none; border-radius: 999px; padding: 8px 16px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; }
    .tabs button.on { background: #fff; color: var(--title); box-shadow: var(--shadow); }
    .drop {
      display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 28px 18px;
      border: 2px dashed var(--line-strong); border-radius: 14px; background: var(--surface-2); cursor: pointer; transition: background .15s, border-color .15s;
    }
    .drop:hover, .drop.over { background: var(--accent-tint); border-color: var(--accent); }
    .drop.busy { cursor: progress; opacity: .8; }
    .drop:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; }
    .drop strong { font-size: 16px; }
    .hero { width: 64px; height: 64px; object-fit: contain; margin-bottom: 4px; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, .14)); }
    .paste { min-height: 200px; font-size: 14px; }
    .finds { line-height: 1.5; }
    @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
  `,
})
export class ImportDialog {
  /** Start at the file step with this subject (e.g. "Choose another file" on the review page). */
  readonly startSubject = input<SubjectKey | null>(null);
  readonly closed = output<void>();
  readonly done = output<ImportDraftData>();

  readonly step = signal<'subject' | 'file'>('subject');
  readonly subject = signal<SubjectKey | null>(null);
  readonly theme = computed(() => (this.subject() ? subjectOf(this.subject()) : null));
  readonly icon = subjectIcon;
  readonly mode = signal<'file' | 'paste'>('file');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly dragging = signal(false);
  readonly fileName = signal('');
  readonly pasted = signal('');

  private readonly dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    afterNextRender(() => {
      const start = this.startSubject();
      if (start) {
        this.subject.set(start);
        this.step.set('file');
      }
      this.dlg()?.nativeElement.showModal();
    });
  }

  close(): void {
    this.dlg()?.nativeElement.close();
    this.closed.emit();
  }

  /** A click on the dimmed area around the panel closes it. */
  backdrop(e: MouseEvent): void {
    if (e.target === this.dlg()?.nativeElement) this.close();
  }

  async onFile(event: Event): Promise<void> {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
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
    if (!isPdf && !isText) return this.error.set('Choose a PDF or a .txt file. For a Word file, save it as PDF first, or paste the text.');
    if (file.size > 15 * 1024 * 1024) return this.error.set('That file is larger than 15 MB. Lesson files are usually under 1 MB.');
    this.busy.set(true);
    try {
      const text = isPdf ? await pdfToText(file) : await file.text();
      if (!text.trim()) return this.error.set('No text could be read from this file. It may be a scanned picture of the page. Paste the text instead.');
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
    if (!this.pasted().trim()) return this.error.set('Paste the story and questions first.');
    this.useText(this.pasted());
  }

  private useText(text: string): void {
    const parsed = parseLessonText(text);
    if (!parsed.paragraphs.length) return this.error.set(parsed.warnings[0] ?? 'No story text was found.');
    this.dlg()?.nativeElement.close();
    this.done.emit({ subject: this.subject()!, parsed, fileName: this.fileName() });
  }
}
