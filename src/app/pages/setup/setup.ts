import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BrandPanel } from '../../shared/brand-panel';

/** W-01 A new teacher opens the administrator's one-time setup link and chooses their own password. */
@Component({
  selector: 'pl-setup',
  imports: [FormsModule, RouterLink, BrandPanel],
  template: `
    <main class="wrap ws">
      <pl-brand-panel class="side" quote="Welcome to Pocket Lessons." sub="Your administrator set up your teacher account. Choose a password to start." />
      <section class="panel">
        <div class="card form-card">
          @if (state() === 'loading') {
            <p class="muted" role="status">Checking your link…</p>
          } @else if (state() === 'bad') {
            <h1>This link does not work</h1>
            <p class="error-text" role="alert">{{ error() }}</p>
            <a class="btn btn-primary" routerLink="/sign-in">Go to sign in</a>
          } @else {
            <h1>Hello, {{ info()?.name }}</h1>
            <p class="muted">You are joining <strong>{{ info()?.center }}</strong> as {{ info()?.email }}.</p>
            <form (ngSubmit)="save()" novalidate>
              <label class="field"><span>Choose a password</span>
                <input class="input" type="password" name="p1" autocomplete="new-password" [(ngModel)]="password" />
                <span class="hint">At least 8 characters.</span>
              </label>
              <label class="field"><span>Type it again</span>
                <input class="input" type="password" name="p2" autocomplete="new-password" [(ngModel)]="again" />
              </label>
              @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
              <button class="btn btn-primary full" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save and start' }}</button>
            </form>
            <p class="small muted note">This link works once. After this, sign in with your email and this password.</p>
          }
        </div>
      </section>
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; grid-template-columns: 5fr 7fr; }
    .wrap.ws { background: #fff; }
    .panel { display: flex; align-items: center; justify-content: center; padding: 32px 20px; background: #fff; }
    .form-card { width: min(440px, 100%); padding: 28px; display: grid; gap: 10px; }
    h1 { font-family: var(--serif); font-size: 30px; }
    form { display: grid; gap: 16px; margin-top: 10px; }
    .full { width: 100%; }
    .note { margin-top: 6px; }
    @media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } }
  `,
})
export class Setup implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly token = input<string>('');
  readonly state = signal<'loading' | 'ready' | 'bad'>('loading');
  readonly info = signal<{ name: string; email: string; center: string } | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  password = '';
  again = '';

  async ngOnInit(): Promise<void> {
    // Someone else may still be signed in on this computer.
    if (this.auth.signedIn()) this.auth.signOut();
    try {
      this.info.set(await this.auth.setupInfo(this.token()));
      this.state.set('ready');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'This setup link has expired or was already used.');
      this.state.set('bad');
    }
  }

  async save(): Promise<void> {
    this.error.set('');
    if (this.password.length < 8) return this.error.set('Use at least 8 characters for your password.');
    if (this.password !== this.again) return this.error.set('The two passwords are not the same.');
    this.busy.set(true);
    const err = await this.auth.completeSetup(this.token(), this.password);
    this.busy.set(false);
    if (err) return this.error.set(err);
    void this.router.navigateByUrl(this.auth.home());
  }
}
