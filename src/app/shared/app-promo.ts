import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { session } from '../core/storage';

/** Where the staging server serves the tester app page (password-protected, see the backend's deploy/Caddyfile). */
export const APP_PAGE = '/get-the-app/';

/**
 * Staging only: a "Get the app" link at the top right of the sign-in page, and, 1 second after the page is shown
 * (after the opening animation), a sunlit pop-up about the Android app. It does not take the cursor from the form.
 * Closing it ("Not now", ✕, Esc or a click elsewhere) keeps it closed for the rest of the browser session.
 */
@Component({
  selector: 'pl-app-promo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (enabled) {
      <a class="get" [href]="page" target="_blank" rel="noopener" (click)="dismiss()">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" /><path d="M10.5 18.5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
        Get the app
      </a>
      @if (open()) {
        <section class="promo" role="dialog" aria-modal="false" aria-labelledby="promo-title" aria-describedby="promo-text">
          <div class="rays" aria-hidden="true"></div>
          <div class="card">
            <button type="button" class="x" (click)="dismiss()" aria-label="Close">✕</button>
            <div class="sun" aria-hidden="true">
              <svg width="46" height="46" viewBox="0 0 48 48">
                <g stroke="#E9A23B" stroke-width="3" stroke-linecap="round">
                  @for (a of rayAngles; track a) { <line x1="24" y1="4" x2="24" y2="9" [attr.transform]="'rotate(' + a + ' 24 24)'" /> }
                </g>
                <circle cx="24" cy="24" r="10" fill="#F6CC59" />
                <circle cx="21" cy="21" r="3.5" fill="#FFF3C9" />
              </svg>
            </div>
            <p class="eyebrow">Android app · for testers</p>
            <h2 id="promo-title">Get Pocket Lessons on your phone</h2>
            <p id="promo-text">
              Teachers share lessons with families nearby in <b>Hub Mode</b>, with no internet. Families get lessons at home,
              and children keep learning even without signal.
            </p>
            <ul>
              <li>Open the link on an <b>Android phone</b> and enter the tester password.</li>
              <li>This is the <b>staging</b> app: use test accounts only.</li>
            </ul>
            <div class="actions">
              <button type="button" class="btn btn-ghost" (click)="dismiss()">Not now</button>
              <a class="btn btn-primary" [href]="page" target="_blank" rel="noopener" (click)="dismiss()">Get the app</a>
            </div>
          </div>
        </section>
      }
    }
  `,
  styles: `
    :host { position: fixed; top: 16px; right: 16px; z-index: 40; display: flex; flex-direction: column; align-items: flex-end; pointer-events: none; }
    .get, .promo { pointer-events: auto; }
    .get {
      display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 999px;
      background: #fff; color: var(--teal); border: 1px solid var(--line); box-shadow: var(--shadow);
      font-weight: 700; font-size: 14px; text-decoration: none; transition: background .15s, box-shadow .15s;
    }
    .get:hover { background: #fffbef; box-shadow: 0 0 0 4px rgba(246, 204, 89, .35), var(--shadow); }

    .promo { position: relative; margin-top: 14px; width: min(360px, calc(100vw - 32px)); animation: rise .5s cubic-bezier(.2, .8, .2, 1) both; }
    /* Sunlight around the panel: slow-turning rays and a warm glow behind it. */
    .rays {
      position: absolute; inset: -90px; z-index: 0; border-radius: 50%; pointer-events: none;
      background:
        radial-gradient(closest-side, rgba(255, 224, 120, .9), rgba(255, 224, 120, .35) 58%, transparent 74%),
        repeating-conic-gradient(from 0deg, rgba(240, 186, 52, .62) 0deg 6deg, transparent 6deg 18deg);
      -webkit-mask: radial-gradient(closest-side, #000 52%, transparent 100%);
      mask: radial-gradient(closest-side, #000 52%, transparent 100%);
      animation: turn 26s linear infinite, glow 3.2s ease-in-out infinite alternate;
    }
    .card {
      position: relative; z-index: 1; background: #fff; border-radius: 18px; padding: 22px 20px 18px;
      border: 1px solid #f3dfa4; box-shadow: 0 0 0 6px rgba(246, 204, 89, .18), 0 24px 48px -18px rgba(22, 60, 59, .35);
      overflow: hidden;
    }
    /* A thin band of light that sweeps across the panel now and then. */
    .card::after {
      content: ''; position: absolute; inset: -40% auto -40% -60%; width: 45%; transform: rotate(18deg);
      background: linear-gradient(90deg, transparent, rgba(255, 244, 205, .85), transparent);
      animation: shine 4.5s ease-in-out 1s infinite; pointer-events: none;
    }
    .x { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: var(--ink-2); cursor: pointer; font-size: 14px; }
    .x:hover { background: #f4f1e8; }
    .sun { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 50%; background: #fff7dd; margin-bottom: 10px; }
    .sun svg { animation: turn 18s linear infinite; }
    .eyebrow { margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--amber); }
    h2 { margin: 0 0 8px; font-family: var(--serif); font-size: 22px; line-height: 1.2; color: var(--ink); }
    p { margin: 0 0 10px; font-size: 14.5px; line-height: 1.5; color: var(--ink-2); }
    ul { margin: 0 0 16px; padding-left: 18px; font-size: 14px; color: var(--ink-2); }
    li { margin-bottom: 4px; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; }
    .actions .btn { text-decoration: none; }

    @keyframes turn { to { transform: rotate(1turn); } }
    @keyframes glow { from { opacity: .75; } to { opacity: 1; } }
    @keyframes shine { 0%, 70% { left: -60%; } 100% { left: 130%; } }
    @keyframes rise { from { opacity: 0; transform: translateY(-8px) scale(.96); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) {
      .rays, .sun svg, .card::after, .promo { animation: none; }
    }
    @media (max-width: 560px) {
      :host { top: 10px; right: 10px; }
      .get { padding: 8px 12px; font-size: 13px; }
    }
  `,
})
export class AppPromo {
  /** Only the private staging portal has the tester app page. */
  readonly enabled = environment.stage === 'staging';
  readonly page = APP_PAGE;
  readonly open = signal(false);
  readonly rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  private readonly host = inject(ElementRef<HTMLElement>);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    if (!this.enabled || session.get('appPromoClosed') === '1') return;
    // Wait for the opening animation (pl-splash) to finish, then show the pop-up 1 second later.
    const poll = setInterval(() => {
      if (document.querySelector('pl-splash')) return;
      clearInterval(poll);
      this.timer = setTimeout(() => this.open.set(true), 1000);
    }, 150);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(poll);
      clearTimeout(this.timer);
    });
  }

  dismiss(): void {
    this.open.set(false);
    session.set('appPromoClosed', '1');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.dismiss();
  }

  @HostListener('document:pointerdown', ['$event'])
  onOutside(e: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.dismiss();
  }
}
