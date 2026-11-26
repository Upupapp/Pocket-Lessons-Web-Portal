import { Component, DestroyRef, ElementRef, Injector, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiMode } from '../../core/api';
import { AuthService, DEMO_ACCOUNT, DEMO_ADMIN_ACCOUNT } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ProcessError, ProcessStep, Processing } from '../../core/processing';
import { local } from '../../core/storage';
import { BrandPanel } from '../../shared/brand-panel';
import { WaveBg } from '../../shared/wave-bg';
import { easeInOutCubic } from '../welcome/welcome-motion';
import { arrival } from '../../core/arrival';
import { AppPromo } from '../../shared/app-promo';

@Component({
  selector: 'pl-sign-in',
  imports: [FormsModule, RouterLink, BrandPanel, WaveBg, AppPromo],
  template: `
    <!--
      Wide screens: Sign in has the green panel on the left and the form on the right; Join with invitation trades
      them, the panel gliding across over the form (the form changes while it is covered). Phones: the form slides.
    -->
    <pl-app-promo />
    <main class="wrap ws" [style.--j]="j()" [style.--glide]="glide()">
      <pl-brand-panel class="side" [quote]="quote()" [sub]="sub()" [front]="mode() === 'join' ? 'teacher' : null" [face]="1 - 2 * j()" />

      <section class="panel">
        <!-- The soft green essence behind the form (the card itself stays white). -->
        <pl-wave-bg />
        <div #card class="card form-card" [class.arrived]="arrived" [style.opacity]="cardOpacity()">
          <div class="tabs" [class.join]="mode() === 'join'" role="tablist">
            <span class="thumb" aria-hidden="true"></span>
            <button type="button" role="tab" [class.on]="mode() === 'signin'" [attr.aria-selected]="mode() === 'signin'" (click)="setMode('signin')">Sign in</button>
            <button type="button" role="tab" [class.on]="mode() === 'join'" [attr.aria-selected]="mode() === 'join'" (click)="setMode('join')">Join with invitation</button>
          </div>

          @if (view() === 'signin') {
          <div class="swap" [class.from-left]="switched()">
            <h1>Welcome back</h1>
            <p class="muted">Sign in to make lessons and check your learners' reading.</p>
            <form (ngSubmit)="signIn($event)" #f="ngForm" novalidate>
              <label class="field">
                <span>Email</span>
                <input class="input" type="email" name="email" autocomplete="username" required [(ngModel)]="email" />
              </label>
              <label class="field">
                <span>Password</span>
                <div class="pw">
                  <input class="input" [type]="showPw() ? 'text' : 'password'" name="password" autocomplete="current-password" required [(ngModel)]="password" />
                  <button type="button" class="link" (click)="showPw.set(!showPw())">{{ showPw() ? 'Hide' : 'Show' }}</button>
                </div>
              </label>
              @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
              <button class="btn btn-primary full" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
            </form>
            <!-- Sample accounts exist only in the browser-only pilot preview, never on the real server. -->
            @if (!apiMode) {
              <div class="demo">
                <p><strong>Pilot preview.</strong> Use a sample account. All names and figures are sample data.</p>
                <div class="demo-buttons">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="useDemo($event)">Sample teacher</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="useAdmin($event)">Sample administrator</button>
                </div>
              </div>
            }
          </div>
          } @else {
          <div class="swap" [class.from-right]="switched()">
            <h1>Join your center</h1>
            <p class="muted">Staff join only with an invitation code from their center coordinator.</p>
            <form (ngSubmit)="join($event)" novalidate>
              <label class="field"><span>Invitation code</span>
                <input class="input" name="code" required [(ngModel)]="code" [placeholder]="apiMode ? 'e.g. TONDO-7KQ3' : 'e.g. TONDO-2027'" autocapitalize="characters" />
                @if (apiMode) {
                  <span class="hint">Your center coordinator gives you this code. New teachers can also use a setup link from the administrator.</span>
                } @else {
                  <span class="hint">Pilot preview codes: TONDO-2027, SUNRISE-2027, SMOKEY-2027, TRIAS-2027. New teachers can also use a setup link from the administrator.</span>
                }
              </label>
              <label class="field"><span>Full name</span><input class="input" name="name" required autocomplete="name" [(ngModel)]="name" /></label>
              <label class="field"><span>Email</span><input class="input" type="email" name="jemail" required autocomplete="email" [(ngModel)]="email" /></label>
              <label class="field"><span>Password</span>
                <input class="input" type="password" name="jpassword" required autocomplete="new-password" [(ngModel)]="password" />
                <span class="hint">At least 8 characters.</span>
              </label>
              @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
              <button class="btn btn-primary full" type="submit" [disabled]="busy()">Create my account</button>
            </form>
          </div>
          }
        </div>
        <p class="small muted note">
          @if (apiMode) { Accounts and lessons are saved on the Pocket Lessons server. }
          @else { Accounts in this preview are saved only in this browser. }
          <a routerLink="/welcome/1">See the welcome pages again</a>
        </p>
      </section>
    </main>
  `,
  styles: `
    .wrap { position: relative; min-height: 100vh; overflow: hidden; }
    .wrap.ws { background: #fff; }
    /* The green panel (5/12 of the width) glides 7/12 across to the other side, over the form, which moves the other way. */
    .side {
      position: absolute; z-index: 2; top: 0; bottom: 0; left: 0; width: calc(100% * 5 / 12); will-change: transform;
      transform: translateX(calc(140% * var(--j, 0)));
      box-shadow: 0 0 calc(70px * var(--glide, 0)) rgba(12, 36, 35, calc(.22 * var(--glide, 0)));
    }
    .panel {
      position: relative; z-index: 1; min-height: 100vh; margin-left: calc(100% * 5 / 12); width: calc(100% * 7 / 12);
      transform: translateX(calc(-71.4286% * var(--j, 0)));
      display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px; gap: 16px; background: var(--bg-wave-s1);
    }
    .form-card { width: min(440px, 100%); padding: 28px; animation: rise .6s cubic-bezier(.2, .8, .2, 1) backwards; }
    /* Reached from the welcome pages' "Get started", the card is already in place: no second rise. */
    .form-card.arrived { animation: none; }
    @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
    .tabs { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--cream-2); border-radius: 999px; padding: 4px; margin-bottom: 24px; }
    /* The white pill slides under the tab that is chosen. */
    .thumb {
      position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 999px; background: var(--white);
      box-shadow: 0 1px 4px rgba(22, 60, 59, .15); transition: transform .35s cubic-bezier(.3, .7, .2, 1);
    }
    .tabs.join .thumb { transform: translateX(100%); }
    .tabs button { position: relative; z-index: 1; border: 0; background: transparent; border-radius: 999px; min-height: 38px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; transition: color .2s; }
    .tabs button.on { color: var(--ink); }
    .tabs button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    h1 { font-family: var(--serif); font-size: 30px; }
    form { display: grid; gap: 16px; margin-top: 20px; }
    .pw { position: relative; }
    .pw .input { padding-right: 64px; }
    .link { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--teal); font: 700 13px var(--font); cursor: pointer; padding: 6px; }
    .full { width: 100%; }
    .demo { margin-top: 20px; padding: 14px; border-radius: var(--r-md); background: var(--surface-2); border: 1px solid var(--line); display: grid; gap: 10px; font-size: 14px; color: var(--ink-2); }
    .demo-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .note { text-align: center; max-width: 440px; }
    .form-card, .note { position: relative; z-index: 1; }
    /* Phones: the panel is a short header above the form; the form's content slides in from the tab's side. */
    @media (max-width: 860px) {
      .wrap { display: flex; flex-direction: column; }
      .side { position: relative; width: auto; transform: none; box-shadow: none; }
      .panel { flex: 1; min-height: 0; margin-left: 0; width: auto; transform: none; }
      .swap.from-right { animation: from-right .38s cubic-bezier(.2, .8, .2, 1) both; }
      .swap.from-left { animation: from-left .38s cubic-bezier(.2, .8, .2, 1) both; }
    }
    @keyframes from-right { from { opacity: 0; transform: translateX(36px); } }
    @keyframes from-left { from { opacity: 0; transform: translateX(-36px); } }
    @media (prefers-reduced-motion: reduce) { .form-card, .swap.from-right, .swap.from-left { animation: none; } .thumb { transition: none; } }
  `,
})
export class SignIn implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly processing = inject(Processing);
  private readonly injector = inject(Injector);
  readonly next = input<string>('');
  /** ?join=1 opens "Join with invitation" (the page keeps it when refreshed). */
  readonly joinParam = input<string>('', { alias: 'join' });
  readonly apiMode = apiMode;

  readonly mode = signal<'signin' | 'join'>('signin');
  /** Where the two sides stand: 0 = panel left (Sign in), 1 = panel right (Join); in between while they glide. */
  readonly j = signal(0);
  /** The form shown: it changes halfway across, while the panel covers it. */
  readonly view = computed<'signin' | 'join'>(() => (this.j() >= 0.5 ? 'join' : 'signin'));
  readonly glide = computed(() => Math.sin(Math.PI * this.j()));
  readonly cardOpacity = computed(() => Math.min(1, Math.abs(this.j() - 0.5) * 5));
  readonly quote = computed(() => (this.view() === 'join' ? '“Join your center’s team.”' : '“Tuloy ang aral, kahit walang signal.”'));
  readonly sub = computed(() => (this.view() === 'join' ? 'Use the invitation code from your center coordinator.' : 'Teacher portal for AHA community learning centers'));
  /** After the first switch, the form's content slides in (phones). */
  readonly switched = signal(false);
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly cardEl = viewChild<ElementRef<HTMLElement>>('card');
  /** Reached from "Get started" on the welcome pages (they turned into this page). */
  readonly arrived = arrival.fromWelcome;
  private raf = 0;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showPw = signal(false);
  email = '';
  password = '';
  name = '';
  code = '';

  constructor() {
    arrival.fromWelcome = false;
    local.set('welcomeSeen', true);
    void this.auth.ensureDemoAccount();
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));
  }

  ngOnInit(): void {
    if (this.joinParam() === '1') {
      this.mode.set('join');
      this.j.set(1);
    }
  }

  /**
   * The tabs. On wide screens the panel and the form trade sides in 0.65 s; on phones (and with reduced motion)
   * the form changes at once, sliding in on phones. Afterwards typing continues in the new form.
   */
  setMode(m: 'signin' | 'join'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.error.set('');
    this.switched.set(true);
    void this.router.navigate([], { queryParams: { join: m === 'join' ? 1 : null }, queryParamsHandling: 'merge', replaceUrl: true });
    const to = m === 'join' ? 1 : 0;
    cancelAnimationFrame(this.raf);
    if (this.reduced || !matchMedia('(min-width: 861px)').matches) {
      this.j.set(to);
      return this.focusForm();
    }
    const from = this.j();
    const dur = 650 * Math.abs(to - from);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / Math.max(1, dur));
      this.j.set(from + (to - from) * easeInOutCubic(p));
      if (p < 1) this.raf = requestAnimationFrame(step);
      else this.focusForm();
    };
    this.raf = requestAnimationFrame(step);
  }

  /** The new form's first field, ready to type in (not on touch screens, where it would pop up the keyboard). */
  private focusForm(): void {
    if (!matchMedia('(pointer: fine)').matches) return;
    setTimeout(() => this.cardEl()?.nativeElement.querySelector<HTMLInputElement>('form input')?.focus({ preventScroll: true }));
  }

  useDemo(event: Event): void {
    this.email = DEMO_ACCOUNT.email;
    this.password = DEMO_ACCOUNT.password;
    void this.signIn(event);
  }

  useAdmin(event: Event): void {
    this.email = DEMO_ADMIN_ACCOUNT.email;
    this.password = DEMO_ADMIN_ACCOUNT.password;
    void this.signIn(event);
  }

  /** Signing in shows the loader: the account is checked, the center's records load, then the work opens behind it. */
  async signIn(event?: Event): Promise<void> {
    this.error.set('');
    if (!this.email || !this.password) return this.error.set('Enter your email and password.');
    this.busy.set(true);
    const r = await this.processing.run({
      title: 'Signing you in',
      detail: this.email.trim(),
      from: event,
      errors: 'inline',
      steps: [
        {
          label: 'Checking your email and password',
          run: async () => {
            const err = await this.auth.signIn(this.email, this.password);
            if (err) throw new ProcessError(err);
          },
        },
        ...this.openSteps(),
      ],
      done: () => ({ title: `Welcome back, ${this.firstName()}`, detail: this.whoAndWhere() }),
    });
    this.busy.set(false);
    if (!r.ok) this.error.set(r.error);
  }

  async join(event?: Event): Promise<void> {
    this.error.set('');
    if (!this.code || !this.name || !this.email || !this.password) return this.error.set('Fill in every field.');
    this.busy.set(true);
    const r = await this.processing.run({
      title: 'Creating your account',
      detail: this.email.trim(),
      from: event,
      errors: 'inline',
      steps: [
        {
          label: 'Checking the invitation code',
          detail: this.code.trim().toUpperCase(),
          run: async () => {
            const err = await this.auth.join({ name: this.name, email: this.email, password: this.password, code: this.code });
            if (err) throw new ProcessError(err);
          },
        },
        ...this.openSteps(),
      ],
      done: () => ({ title: `Welcome, ${this.firstName()}`, detail: `Account created · ${this.auth.user()?.center ?? ''}` }),
    });
    this.busy.set(false);
    if (!r.ok) this.error.set(r.error);
  }

  /** After the account is accepted: load the center's records (teachers), then open the work. */
  private openSteps(): ProcessStep[] {
    return [
      {
        label: 'Loading your records',
        detail: () => (this.auth.isAdmin() ? 'Every AHA center' : (this.auth.user()?.center ?? '')),
        run: () => (this.auth.isAdmin() ? undefined : this.injector.get(DataService).whenReady()),
      },
      {
        label: 'Opening your work',
        detail: () => (this.auth.isAdmin() ? 'The administrator area' : 'Your dashboard'),
        run: () => this.go(),
      },
    ];
  }

  private firstName(): string {
    return (this.auth.user()?.name ?? '').split(' ')[0];
  }

  private whoAndWhere(): string {
    const u = this.auth.user();
    return u ? `Signed in · ${u.center}` : '';
  }

  private go(): Promise<boolean> {
    // Return to the page the person was on, but only inside their own area (/admin or /app).
    const home = this.auth.home();
    const target = this.next() && this.next().startsWith(home) ? this.next() : home;
    return this.router.navigateByUrl(target);
  }
}
