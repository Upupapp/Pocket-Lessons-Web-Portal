import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { uid } from '../core/models';
import { media } from '../core/storage';

export interface Recording {
  audioId: string;
  audioBytes: number;
  audioSeconds: number;
}

/** About 16 kbps speech, which keeps a minute of voice near 120 KB (the brief's target). */
const BITRATE = 16000;
const MAX_SECONDS = 90;

function pickMime(): string {
  const options = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  return options.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

/**
 * Records the teacher reading one page aloud. The take is kept in IndexedDB.
 * If recording fails (no microphone, permission blocked, lost connection), the existing take is kept.
 */
@Component({
  selector: 'pl-voice-recorder',
  template: `
    <div class="rec" [class.live]="state() === 'recording'">
      @switch (state()) {
        @case ('recording') {
          <button type="button" class="round stop" (click)="stop()" aria-label="Stop recording">
            <span class="sq"></span>
          </button>
          <div class="meter" aria-hidden="true">
            @for (b of bars(); track $index) { <span [style.height.%]="b"></span> }
          </div>
          <span class="time">{{ clock(elapsed()) }} / {{ clock(max) }}</span>
        }
        @case ('asking') {
          <span class="muted small">Allow the microphone in your browser…</span>
        }
        @default {
          @if (url()) {
            <audio [src]="url()" controls preload="metadata"></audio>
            <button type="button" class="btn btn-ghost btn-sm" (click)="start()">Record again</button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="remove()" aria-label="Delete recording">Delete</button>
          } @else {
            <button type="button" class="btn btn-primary btn-sm" (click)="start()">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" /></svg>
              {{ label() }}
            </button>
            <span class="muted small">{{ hint() }}</span>
          }
        }
      }
    </div>
    @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
  `,
  styles: `
    .rec { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-height: 44px; }
    audio { height: 36px; max-width: 260px; }
    .round { width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; }
    .stop { background: var(--red); box-shadow: 0 0 0 6px rgba(180, 71, 58, .18); animation: pulse 1.4s ease-in-out infinite; }
    .sq { width: 14px; height: 14px; border-radius: 3px; background: #fff; }
    .meter { display: flex; align-items: center; gap: 3px; height: 32px; flex: 1; min-width: 120px; max-width: 260px; }
    .meter span { flex: 1; min-height: 8%; background: var(--teal); border-radius: 3px; transition: height .08s; }
    .time { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--red); }
    @keyframes pulse { 50% { box-shadow: 0 0 0 10px rgba(180, 71, 58, .08); } }
  `,
})
export class VoiceRecorder {
  readonly audioId = input<string | undefined>();
  readonly label = input('Record this page');
  readonly hint = input('Read it aloud in your own voice.');
  readonly recorded = output<Recording>();
  readonly removed = output<void>();

  readonly state = signal<'idle' | 'asking' | 'recording'>('idle');
  readonly url = signal<string>('');
  readonly error = signal('');
  readonly elapsed = signal(0);
  readonly bars = signal<number[]>(Array(18).fill(8));
  readonly max = MAX_SECONDS;

  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private audioCtx?: AudioContext;
  private chunks: Blob[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private startedAt = 0;

  constructor() {
    // Track only the audio id. setUrl reads url(), so it must run untracked or the effect clears itself in a loop.
    effect(() => {
      const id = this.audioId();
      untracked(() => this.setUrl(''));
      if (id) media.get(id).then((blob) => blob && id === this.audioId() && this.setUrl(URL.createObjectURL(blob)));
    });
    inject(DestroyRef).onDestroy(() => {
      this.cleanup();
      this.setUrl('');
    });
  }

  clock(s: number): string {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  async start(): Promise<void> {
    this.error.set('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('This browser cannot record audio. Use a recent Chrome, Edge or Firefox.');
      return;
    }
    this.state.set('asking');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      this.state.set('idle');
      const name = (err as DOMException)?.name;
      this.error.set(
        name === 'NotAllowedError'
          ? 'The microphone is blocked. Allow it in the browser address bar, then try again. Your earlier take is kept.'
          : 'No microphone was found. Plug one in or use a laptop with a built-in microphone.',
      );
      return;
    }
    const mimeType = pickMime();
    this.recorder = new MediaRecorder(this.stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: BITRATE });
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.onstop = () => void this.save(mimeType);
    this.recorder.start(250);
    this.startedAt = performance.now();
    this.elapsed.set(0);
    this.state.set('recording');
    this.watchLevel();
    this.timer = setInterval(() => {
      const s = (performance.now() - this.startedAt) / 1000;
      this.elapsed.set(s);
      if (s >= MAX_SECONDS) this.stop();
    }, 200);
  }

  stop(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  async remove(): Promise<void> {
    const id = this.audioId();
    if (id) await media.delete(id).catch(() => undefined);
    this.setUrl('');
    this.removed.emit();
  }

  private async save(mimeType: string): Promise<void> {
    const seconds = Math.max(1, Math.round((performance.now() - this.startedAt) / 1000));
    this.cleanup();
    this.state.set('idle');
    const blob = new Blob(this.chunks, { type: mimeType || 'audio/webm' });
    if (blob.size < 500) {
      this.error.set('Nothing was recorded. Check that the microphone is not muted. Your earlier take is kept.');
      return;
    }
    const previous = this.audioId();
    const id = uid('aud');
    await media.put(id, blob);
    if (previous) await media.delete(previous).catch(() => undefined);
    this.recorded.emit({ audioId: id, audioBytes: blob.size, audioSeconds: seconds });
  }

  private watchLevel(): void {
    if (!this.stream) return;
    try {
      this.audioCtx = new AudioContext();
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 64;
      this.audioCtx.createMediaStreamSource(this.stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (this.state() !== 'recording') return;
        analyser.getByteFrequencyData(data);
        this.bars.set(Array.from({ length: 18 }, (_, i) => Math.max(8, Math.min(100, (data[i + 1] / 255) * 130))));
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* the meter is decoration only */
    }
  }

  private cleanup(): void {
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = undefined;
  }

  private setUrl(url: string): void {
    if (this.url()) URL.revokeObjectURL(this.url());
    this.url.set(url);
  }
}
