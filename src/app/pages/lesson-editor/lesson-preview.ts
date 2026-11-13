import { Component, DestroyRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { Lesson } from '../../core/models';
import { media } from '../../core/storage';
import { MediaImage } from '../../shared/media-image';

/**
 * Child-view preview (WEB-11). Words light up evenly across the recording;
 * exact word timing is set later in the read-along editor (WEB-09).
 */
@Component({
  selector: 'pl-lesson-preview',
  imports: [MediaImage],
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-label="Child view preview">
      <div class="bar">
        <strong>Child view preview</strong>
        <button type="button" class="x" (click)="closed.emit()" aria-label="Close preview">✕</button>
      </div>

      <div class="phone">
        <div class="screen">
          <div class="progress">
            @for (s of steps(); track $index) { <span [class.on]="$index <= step()"></span> }
          </div>

          @if (onPage(); as p) {
            <div class="pic">
              @if (p.pictureId) { <pl-media-image [mediaId]="p.pictureId" alt="" /> } @else { <span class="nopic">No picture</span> }
            </div>
            <p class="words" lang="fil">
              @for (w of words(); track $index) {
                <span [class.lit]="$index === litWord()" [class.read]="$index < litWord()">{{ w }}</span>{{ ' ' }}
              }
            </p>
            <button type="button" class="play" (click)="play()" [disabled]="!p.audioId" [attr.aria-label]="playing() ? 'Playing' : 'Play teacher voice'">
              @if (playing()) {
                <span class="eq"><i></i><i></i><i></i></span>
              } @else {
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
              }
            </button>
            @if (!p.audioId) { <p class="warn">This page has no recording yet</p> }
          } @else if (onActivity(); as a) {
            <p class="q">{{ a.prompt || 'Question' }}</p>
            <div class="answers">
              @for (c of a.choices; track $index) {
                <button type="button" class="ans" [class.good]="picked() === $index && $index === a.answer" [class.bad]="picked() === $index && $index !== a.answer" (click)="picked.set($index)">
                  {{ c || '…' }}
                </button>
              }
            </div>
            @if (picked() !== null) {
              <p class="feedback">{{ picked() === a.answer ? 'Magaling! Great job!' : 'Subukan ulit. Try again, you can do it.' }}</p>
            }
          }

          <div class="nav">
            <button type="button" (click)="go(-1)" [disabled]="step() === 0" aria-label="Previous">‹</button>
            <span>{{ step() + 1 }} / {{ steps().length }}</span>
            <button type="button" (click)="go(1)" [disabled]="step() === steps().length - 1" aria-label="Next">›</button>
          </div>
        </div>
      </div>
      <p class="note">Words light up evenly in this preview. Exact word timing comes with the read-along editor.</p>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; }
    .backdrop { position: absolute; inset: 0; background: rgba(6, 35, 31, .6); }
    .dialog { position: relative; background: var(--cream); border-radius: 24px; padding: 16px 20px 18px; width: min(420px, 94vw); max-height: 96vh; overflow: auto; box-shadow: 0 30px 80px rgba(0, 0, 0, .35); }
    .bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .x { border: 0; background: var(--white); width: 36px; height: 36px; border-radius: 50%; cursor: pointer; }
    .phone { margin: 0 auto; width: 320px; max-width: 100%; border-radius: 40px; padding: 12px; background: #0b2f2c; }
    .screen { background: #fff9ed; border-radius: 30px; min-height: 560px; padding: 18px 16px 14px; display: flex; flex-direction: column; gap: 14px; }
    .progress { display: flex; gap: 4px; }
    .progress span { flex: 1; height: 5px; border-radius: 999px; background: #e8e1d1; }
    .progress span.on { background: var(--teal); }
    .pic { height: 190px; border-radius: 20px; overflow: hidden; background: #f3ead6; display: grid; place-items: center; }
    .pic pl-media-image { width: 100%; height: 100%; }
    .nopic { color: var(--muted); font-size: 13px; }
    .words { font-size: 26px; line-height: 1.5; font-weight: 700; text-align: center; min-height: 80px; }
    .words span { border-radius: 8px; padding: 0 3px; transition: background .12s; }
    .words .lit { background: var(--sun); }
    .words .read { color: var(--teal); }
    .play { align-self: center; width: 72px; height: 72px; border-radius: 50%; border: 0; background: var(--teal); color: #fff; cursor: pointer; display: grid; place-items: center; box-shadow: 0 10px 24px -10px rgba(20, 107, 96, .9); }
    .play:disabled { background: #b8c9c4; }
    .eq { display: flex; gap: 4px; align-items: end; height: 26px; }
    .eq i { width: 6px; background: #fff; border-radius: 3px; animation: eq .7s ease-in-out infinite; }
    .eq i:nth-child(2) { animation-delay: -.2s; } .eq i:nth-child(3) { animation-delay: -.4s; }
    .warn { text-align: center; color: var(--amber); font-size: 13px; }
    .q { font-size: 22px; font-weight: 700; text-align: center; margin-top: 30px; }
    .answers { display: grid; gap: 10px; }
    .ans { min-height: 60px; border-radius: 18px; border: 2px solid var(--line); background: #fff; font: 700 20px var(--font); color: var(--ink); cursor: pointer; }
    .ans.good { border-color: var(--teal); background: var(--mint); }
    .ans.bad { border-color: var(--sun); background: var(--sun-soft); }
    .feedback { text-align: center; font-weight: 700; color: var(--teal-dark); }
    .nav { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
    .nav button { width: 48px; height: 48px; border-radius: 50%; border: 0; background: var(--sun); font-size: 26px; cursor: pointer; color: #3d2e00; }
    .nav button:disabled { opacity: .35; }
    .note { margin-top: 12px; font-size: 12.5px; color: var(--muted); text-align: center; }
    @keyframes eq { 0%, 100% { height: 30%; } 50% { height: 100%; } }
  `,
})
export class LessonPreview {
  readonly lesson = input.required<Lesson>();
  readonly closed = output<void>();

  readonly step = signal(0);
  readonly picked = signal<number | null>(null);
  readonly playing = signal(false);
  readonly litWord = signal(-1);

  readonly steps = computed(() => [
    ...this.lesson().pages.map((p) => ({ kind: 'page' as const, page: p })),
    ...this.lesson().activities.map((a) => ({ kind: 'activity' as const, activity: a })),
  ]);
  readonly onPage = computed(() => {
    const s = this.steps()[this.step()];
    return s?.kind === 'page' ? s.page : null;
  });
  readonly onActivity = computed(() => {
    const s = this.steps()[this.step()];
    return s?.kind === 'activity' ? s.activity : null;
  });
  readonly words = computed(() => (this.onPage()?.text ?? '').split(/\s+/).filter(Boolean));

  private audio?: HTMLAudioElement;
  private url = '';

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopAudio());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  go(delta: number): void {
    this.stopAudio();
    this.picked.set(null);
    this.litWord.set(-1);
    this.step.update((s) => Math.max(0, Math.min(this.steps().length - 1, s + delta)));
  }

  async play(): Promise<void> {
    const p = this.onPage();
    if (!p?.audioId) return;
    this.stopAudio();
    const blob = await media.get(p.audioId);
    if (!blob) return;
    this.url = URL.createObjectURL(blob);
    const audio = new Audio(this.url);
    this.audio = audio;
    const total = this.words().length;
    const seconds = p.audioSeconds || 1;
    audio.ontimeupdate = () => {
      const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seconds;
      this.litWord.set(Math.min(total - 1, Math.floor((audio.currentTime / d) * total)));
    };
    audio.onended = () => {
      this.playing.set(false);
      this.litWord.set(total);
    };
    this.playing.set(true);
    await audio.play().catch(() => this.playing.set(false));
  }

  private stopAudio(): void {
    this.audio?.pause();
    this.audio = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = '';
    this.playing.set(false);
  }
}
