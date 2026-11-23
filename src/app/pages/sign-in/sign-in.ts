import { Component, Injector, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiMode } from '../../core/api';
import { AuthService, DEMO_ACCOUNT, DEMO_ADMIN_ACCOUNT } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ProcessError, ProcessStep, Processing } from '../../core/processing';
import { local } from '../../core/storage';
import { BrandPanel } from '../../shared/brand-panel';

@Component({
  selector: 'pl-sign-in',
  imports: [FormsModule, RouterLink, BrandPanel],
  template: `
    <main class="wrap ws">
      <pl-brand-panel class="side" quote="“Tuloy ang aral, kahit walang signal.”" sub="Teacher portal for AHA community learning centers" />

      <section class="panel">
        <div class="card form-card">
          <div class="tabs" role="tablist">
            <button type="button" role="tab" [class.on]="mode() === 'signin'" [attr.aria-selected]="mode() === 'signin'" (click)="mode.set('signin')">Sign in</button>
            <button type="button" role="tab" [class.on]="mode() === 'join'" [attr.aria-selected]="mode() === 'join'" (click)="mode.set('join')">Join with invitation</button>
          </div>

          @if (mode() === 'signin') {
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
            <div class="demo">
              <p><strong>Pilot preview.</strong> Use a sample account. All names and figures are sample data.</p>
              <div class="demo-buttons">
                <button type="button" class="btn btn-ghost btn-sm" (click)="useDemo($event)">Sample teacher</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="useAdmin($event)">Sample administrator</button>
              </div>
            </div>
          } @else {
            <h1>Join your center</h1>
            <p class="muted">Staff join only with an invitation code from their center coordinator.</p>
            <form (ngSubmit)="join($event)" novalidate>
              <label class="field"><span>Invitation code</span>
                <input class="input" name="code" required [(ngModel)]="code" placeholder="e.g. TONDO-2027" autocapitalize="characters" />
                <span class="hint">Pilot preview codes: TONDO-2027, SUNRISE-2027, SMOKEY-2027, TRIAS-2027. New teachers can also use a setup link from the administrator.</span>
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
    .wrap { min-height: 100vh; display: grid; grid-template-columns: 5fr 7fr; }
    .wrap.ws { background: #fff; }
    .panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px; gap: 16px; background: #fff; }
    .form-card { width: min(440px, 100%); padding: 28px; animation: rise .6s cubic-bezier(.2, .8, .2, 1) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
    .tabs { display: grid; grid-template-columns: 1fr 1fr; background: var(--cream-2); border-radius: 999px; padding: 4px; margin-bottom: 24px; }
    .tabs button { border: 0; background: transparent; border-radius: 999px; min-height: 38px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; }
    .tabs button.on { background: var(--white); color: var(--ink); box-shadow: 0 1px 4px rgba(22, 60, 59, .15); }
    h1 { font-family: var(--serif); font-size: 30px; }
    form { display: grid; gap: 16px; margin-top: 20px; }
    .pw { position: relative; }
    .pw .input { padding-right: 64px; }
    .link { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--teal); font: 700 13px var(--font); cursor: pointer; padding: 6px; }
    .full { width: 100%; }
    .demo { margin-top: 20px; padding: 14px; border-radius: var(--r-md); background: var(--surface-2); border: 1px solid var(--line); display: grid; gap: 10px; font-size: 14px; color: var(--ink-2); }
    .demo-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .note { text-align: center; max-width: 440px; }
    @media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .form-card { animation: none; } }
  `,
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly processing = inject(Processing);
  private readonly injector = inject(Injector);
  readonly next = input<string>('');
  readonly apiMode = apiMode;

  readonly mode = signal<'signin' | 'join'>('signin');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showPw = signal(false);
  email = '';
  password = '';
  name = '';
  code = '';

  constructor() {
    local.set('welcomeSeen', true);
    void this.auth.ensureDemoAccount();
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
