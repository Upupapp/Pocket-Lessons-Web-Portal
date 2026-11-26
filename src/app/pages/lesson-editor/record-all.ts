import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LessonPage } from '../../core/models';
import { FormDialog } from '../../shared/form-dialog';
import { Recording, VoiceRecorder } from '../../shared/voice-recorder';

/**
 * "Record all pages": the teacher reads the lesson aloud page by page without scrolling the editor.
 * One page's words in big letters, the usual recorder under them, then Next. Each take is saved at once,
 * so nothing is lost if she stops halfway. By default it visits only the pages that still need her voice.
 */
@Component({
  selector: 'pl-record-all',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormDialog, VoiceRecorder],
  template: `
    <pl-form-dialog #dlg title="Record all pages" [eyebrow]="'Page ' + (page() + 1) + ' of ' + pages().length" [lead]="lead()" [wide]="true" (closed)="closed.emit()">
      @if (pages()[page()]; as p) {
        <div class="ra">
          <p class="words" [class.long]="p.text.length > 160">{{ p.text || '(This page has no words yet.)' }}</p>
          @if (p.voice === 'computer') { <p class="cv">Now: computer voice. Record yours to replace it.</p> }
          <pl-voice-recorder [audioId]="p.voice === 'computer' ? undefined : p.audioId" label="Record this page" (recorded)="onRecorded($event)" (removed)="removed.emit(page())" />
          <ol class="dots" aria-label="Pages">
            @for (x of pages(); track x.id; let i = $index) {
              <li>
                <button type="button" [class.here]="i === page()" [class.done]="!!x.audioId && x.voice !== 'computer'" (click)="page.set(i)" [attr.aria-label]="'Page ' + (i + 1) + (x.audioId ? ', recorded' : ', needs your voice')">{{ i + 1 }}</button>
              </li>
            }
          </ol>
        </div>
      }
      <div class="dlg-actions">
        <button type="button" class="btn btn-ghost" (click)="step(-1)" [disabled]="page() === 0">‹ Previous</button>
        @if (left() === 0) {
          <button type="button" class="btn btn-primary" (click)="dlg.close()">Done · all pages recorded</button>
        } @else {
          <button type="button" class="btn btn-primary" (click)="next()">{{ isLast() ? 'Done' : 'Next page ›' }}</button>
        }
      </div>
    </pl-form-dialog>
  `,
  styles: `
    .ra { display: grid; gap: 14px; }
    .words { margin: 0; padding: 18px 20px; border-radius: 14px; background: var(--accent-tint, #edf5f0); font: 700 26px/1.45 var(--serif); color: var(--ink, #141b18); }
    .words.long { font-size: 20px; }
    .cv { margin: 0; font-size: 13px; color: #7a5200; }
    .dots { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .dots button { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--line, #e3e7e2); background: #fff; font-weight: 700; cursor: pointer; }
    .dots button.done { background: var(--accent-tint, #edf5f0); border-color: var(--accent, #146b60); color: var(--accent, #146b60); }
    .dots button.here { outline: 3px solid #f6cc59; outline-offset: 1px; }
  `,
})
export class RecordAll {
  readonly pages = input.required<LessonPage[]>();
  /** The page to start on (the first one that needs a voice). */
  readonly start = input(0);
  readonly recorded = output<{ index: number; rec: Recording }>();
  readonly removed = output<number>();
  readonly closed = output<void>();

  readonly page = signal(0);
  readonly left = computed(() => this.pages().filter((p) => !p.audioId || p.voice === 'computer').length);
  readonly isLast = computed(() => this.page() >= this.pages().length - 1);
  readonly lead = computed(() =>
    this.left() ? `${this.left()} ${this.left() === 1 ? 'page needs' : 'pages need'} your voice. Each take is saved as you go.` : 'Every page has your voice.',
  );

  ngOnInit(): void {
    this.page.set(Math.min(Math.max(0, this.start()), this.pages().length - 1));
  }

  onRecorded(rec: Recording): void {
    this.recorded.emit({ index: this.page(), rec });
  }

  step(d: -1 | 1): void {
    this.page.update((p) => Math.min(Math.max(0, p + d), this.pages().length - 1));
  }

  /** Next page that still needs a voice, or simply the next page. */
  next(): void {
    const ps = this.pages();
    for (let i = this.page() + 1; i < ps.length; i++) {
      if (!ps[i].audioId || ps[i].voice === 'computer') return this.page.set(i);
    }
    if (!this.isLast()) this.step(1);
  }
}
