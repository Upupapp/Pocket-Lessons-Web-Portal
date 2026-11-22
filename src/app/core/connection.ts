import { signal } from '@angular/core';

/** What the intro knows about the link to the Pocket Lessons server. */
export type LinkState = 'checking' | 'online' | 'offline' | 'preview';
/** Why it is not online: the computer has no internet, or the internet works but the server does not answer. */
export type LinkProblem = 'internet' | 'server' | null;

export interface ConnectionOptions {
  fetch?: typeof fetch;
  isOnline?: () => boolean;
  now?: () => number;
  /** Keep trying this long before saying "offline". */
  patienceMs?: number;
  /** Wait between tries while still patient. */
  retryMs?: number;
  /** Wait between tries once offline (it keeps trying in the background). */
  offlineRetryMs?: number;
  /** Give up on one try after this long. */
  timeoutMs?: number;
}

/**
 * Checks that the Pocket Lessons server (and its database) answers, using the public /health address.
 * With no server address (the browser-only pilot preview) the state is simply "preview".
 */
export class ConnectionWatch {
  readonly state = signal<LinkState>('checking');
  readonly problem = signal<LinkProblem>(null);

  private readonly fetchFn: typeof fetch;
  private readonly isOnline: () => boolean;
  private readonly now: () => number;
  private readonly patienceMs: number;
  private readonly retryMs: number;
  private readonly offlineRetryMs: number;
  private readonly timeoutMs: number;
  private startedAt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private busy = false;
  private readonly onOnline = () => this.retry();

  constructor(
    private readonly apiUrl: string,
    opts: ConnectionOptions = {},
  ) {
    this.fetchFn = opts.fetch ?? ((...a) => fetch(...a));
    this.isOnline = opts.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    this.now = opts.now ?? (() => Date.now());
    this.patienceMs = opts.patienceMs ?? 10_000;
    this.retryMs = opts.retryMs ?? 2_000;
    this.offlineRetryMs = opts.offlineRetryMs ?? 5_000;
    this.timeoutMs = opts.timeoutMs ?? 6_000;
    if (!apiUrl) this.state.set('preview');
  }

  start(): void {
    if (!this.apiUrl) return;
    this.stopped = false;
    this.startedAt = this.now();
    if (typeof window !== 'undefined') window.addEventListener('online', this.onOnline);
    void this.attempt();
  }

  /** Try again now, with fresh patience (the "Try again" button, or the browser saying the internet is back). */
  retry(): void {
    if (!this.apiUrl || this.stopped || this.state() === 'online') return;
    clearTimeout(this.timer);
    this.startedAt = this.now();
    this.state.set('checking');
    void this.attempt();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onOnline);
  }

  private async attempt(): Promise<void> {
    if (this.stopped || this.busy) return;
    this.busy = true;
    const result = await this.probe();
    this.busy = false;
    if (this.stopped) return;
    if (result === 'ok') {
      this.problem.set(null);
      this.state.set('online');
      this.stop();
      return;
    }
    this.problem.set(result);
    if (this.now() - this.startedAt >= this.patienceMs) this.state.set('offline');
    const wait = this.state() === 'offline' ? this.offlineRetryMs : this.retryMs;
    this.timer = setTimeout(() => void this.attempt(), wait);
  }

  private async probe(): Promise<'ok' | 'internet' | 'server'> {
    if (!this.isOnline()) return 'internet';
    const ctrl = typeof AbortController === 'undefined' ? undefined : new AbortController();
    const t = setTimeout(() => ctrl?.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(`${this.apiUrl}/health`, { cache: 'no-store', signal: ctrl?.signal });
      return res.ok ? 'ok' : 'server';
    } catch {
      return this.isOnline() ? 'server' : 'internet';
    } finally {
      clearTimeout(t);
    }
  }
}
