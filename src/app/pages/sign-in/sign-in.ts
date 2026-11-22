import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiMode } from '../../core/api';
import { AuthService, DEMO_ACCOUNT, DEMO_ADMIN_ACCOUNT } from '../../core/auth.service';
import { local } from '../../core/storage';
import { Logo } from '../../shared/logo';

@Component({
  selector: 'pl-sign-in',
  imports: [FormsModule, RouterLink, Logo],
  template: `
    <main class="wrap">
      <section class="side" aria-hidden="true">
        <pl-logo [light]="true" />
        <div class="quote">
          <p class="big">“Tuloy ang aral, kahit walang signal.”</p>
          <p class="small-print">Teacher portal for AHA community learning centers</p>
        </div>
        <p class="credit">AHA Learning Center × UpUp Technologies</p>
      </section>

      <section class="panel">
        <div class="card form-card">
          <div class="tabs" role="tablist">
            <button type="button" role="tab" [class.on]="mode() === 'signin'" [attr.aria-selected]="mode() === 'signin'" (click)="mode.set('signin')">Sign in</button>
            <button type="button" role="tab" [class.on]="mode() === 'join'" [attr.aria-selected]="mode() === 'join'" (click)="mode.set('join')">Join with invitation</button>
          </div>

          @if (mode() === 'signin') {
            <h1>Welcome back</h1>
            <p class="muted">Sign in to make lessons and check your learners' reading.</p>
            <form (ngSubmit)="signIn()" #f="ngForm" novalidate>
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
                <button type="button" class="btn btn-ghost btn-sm" (click)="useDemo()">Sample teacher</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="useAdmin()">Sample administrator</button>
              </div>
            </div>
          } @else {
            <h1>Join your center</h1>
            <p class="muted">Staff join only with an invitation code from their center coordinator.</p>
            <form (ngSubmit)="join()" novalidate>
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
    .side {
      background: radial-gradient(110% 90% at 20% 0%, #0E4943, #0B3B37 55%, #072B27);
      padding: 32px 40px; display: flex; flex-direction: column; justify-content: space-between; color: #FFF9ED;
    }
    .big { font-family: var(--serif); font-size: clamp(28px, 3vw, 40px); line-height: 1.15; }
    .small-print { margin-top: 12px; color: #B9D6CE; }
    .credit { color: rgba(210, 230, 223, .7); font-size: 13px; }
    .panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px; gap: 16px; }
    .form-card { width: min(440px, 100%); padding: 28px; }
    .tabs { display: grid; grid-template-columns: 1fr 1fr; background: var(--cream-2); border-radius: 999px; padding: 4px; margin-bottom: 24px; }
    .tabs button { border: 0; background: transparent; border-radius: 999px; min-height: 38px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; }
    .tabs button.on { background: var(--white); color: var(--ink); box-shadow: 0 1px 4px rgba(22, 60, 59, .15); }
    h1 { font-family: var(--serif); font-size: 30px; }
    form { display: grid; gap: 16px; margin-top: 20px; }
    .pw { position: relative; }
    .pw .input { padding-right: 64px; }
    .link { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--teal); font: 700 13px var(--font); cursor: pointer; padding: 6px; }
    .full { width: 100%; }
    .demo { margin-top: 20px; padding: 14px; border-radius: var(--r-md); background: var(--sun-soft); display: grid; gap: 10px; font-size: 14px; }
    .demo-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .note { text-align: center; max-width: 440px; }
    @media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } .side { min-height: 200px; gap: 20px; } }
  `,
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
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

  useDemo(): void {
    this.email = DEMO_ACCOUNT.email;
    this.password = DEMO_ACCOUNT.password;
    void this.signIn();
  }

  useAdmin(): void {
    this.email = DEMO_ADMIN_ACCOUNT.email;
    this.password = DEMO_ADMIN_ACCOUNT.password;
    void this.signIn();
  }

  async signIn(): Promise<void> {
    this.error.set('');
    if (!this.email || !this.password) return this.error.set('Enter your email and password.');
    this.busy.set(true);
    const err = await this.auth.signIn(this.email, this.password);
    this.busy.set(false);
    if (err) return this.error.set(err);
    this.go();
  }

  async join(): Promise<void> {
    this.error.set('');
    if (!this.code || !this.name || !this.email || !this.password) return this.error.set('Fill in every field.');
    this.busy.set(true);
    const err = await this.auth.join({ name: this.name, email: this.email, password: this.password, code: this.code });
    this.busy.set(false);
    if (err) return this.error.set(err);
    this.go();
  }

  private go(): void {
    // Return to the page the person was on, but only inside their own area (/admin or /app).
    const home = this.auth.home();
    const target = this.next() && this.next().startsWith(home) ? this.next() : home;
    void this.router.navigateByUrl(target);
  }
}
