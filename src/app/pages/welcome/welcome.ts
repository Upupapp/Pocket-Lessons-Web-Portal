import { Component, DestroyRef, ElementRef, HostListener, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { local } from '../../core/storage';
import { Logo } from '../../shared/logo';
import { ALL_ICONS, Lang, PAGES, SUNBURST_PATH, WORDS, colorsAt, confetti, dot, easeInOutCubic, rubber, say, scene, settle } from './welcome-motion';

const LOOP_MS = 8000;
const PAGE_MS = 520;

/**
 * W1–W3 Welcome pages, the same as the mobile app's: soft sun, sky and mint pages with floating 3D
 * pictures, a white card with a wave edge, and the same motion when moving between pages
 * (colours blend, layers slide at different depths, dots stretch, the round button fills, then opens).
 */
@Component({
  selector: 'pl-welcome',
  imports: [Logo],
  template: `
    <main
      class="welcome"
      [class.leaving]="leaving()"
      [style.--accent]="colors().accent"
      [style.--accent-glow]="colors().accentGlow"
      [attr.lang]="lang() === 'fil' ? 'fil' : 'en'"
      [attr.aria-label]="t(words.region)"
    >
      <div class="bg" [style.background]="'linear-gradient(180deg, ' + colors().top + ', ' + colors().bottom + ')'"></div>

      <header class="bar">
        <div class="lang" role="group" [attr.aria-label]="t(words.language)">
          <button type="button" [class.on]="lang() === 'en'" [attr.aria-pressed]="lang() === 'en'" (click)="setLang('en')">English</button>
          <button type="button" [class.on]="lang() === 'fil'" [attr.aria-pressed]="lang() === 'fil'" (click)="setLang('fil')">Filipino</button>
        </div>
        <pl-logo class="logo" variant="full" [height]="44" />
      </header>

      <section
        class="stage"
        #stage
        aria-hidden="true"
        (pointerdown)="down($event)"
        (pointermove)="drag($event)"
        (pointerup)="up($event)"
        (pointercancel)="up($event)"
      >
        <svg class="confetti" [attr.viewBox]="'0 0 ' + sw() + ' ' + sh()" preserveAspectRatio="none">
          @for (b of bits(); track $index) {
            @if (b.round) {
              <circle [attr.cx]="b.x" [attr.cy]="b.y" r="3.5" [attr.fill]="b.color" />
            } @else {
              <rect x="-5" y="-2.5" width="10" height="5" rx="2" [attr.fill]="b.color" [attr.transform]="'translate(' + b.x + ' ' + b.y + ') rotate(' + deg(b.rotate) + ')'" />
            }
          }
        </svg>

        @for (s of scenes(); track s.k) {
          <div class="scene" [style.transform]="'translate3d(' + s.shift + 'px,0,0)'" [style.opacity]="s.opacity">
            <div
              class="glow"
              [style.left.px]="s.glow.x"
              [style.top.px]="s.glow.y"
              [style.width.px]="s.glow.size"
              [style.height.px]="s.glow.size"
              [style.background]="'radial-gradient(circle, ' + s.glow.color + ' 0%, ' + s.glow.color + '8c 55%, ' + s.glow.color + '00 100%)'"
            ></div>
            <svg class="burst" viewBox="0 0 100 100" [style.left.px]="s.burst.x" [style.top.px]="s.burst.y" [style.width.px]="s.burst.size" [style.height.px]="s.burst.size" [style.transform]="'rotate(' + s.burst.rotate + 'rad)'">
              <path [attr.d]="sunburst" fill="#fff" />
            </svg>
            @if (s.ring; as r) {
              <svg class="ring" [attr.viewBox]="'0 0 ' + r.w + ' ' + r.h" [style.left.px]="r.x" [style.top.px]="r.y" [style.width.px]="r.w" [style.height.px]="r.h">
                <ellipse [attr.cx]="r.w / 2" [attr.cy]="r.h / 2" [attr.rx]="r.w / 2 - 2" [attr.ry]="r.h / 2 - 2" fill="none" [attr.stroke]="r.color" stroke-width="3" stroke-dasharray="9 9" />
              </svg>
            }
            @for (f of s.back; track $index) {
              <img class="pic" [src]="'icons3d/' + f.icon + '.webp'" alt="" draggable="false" [style.width.px]="f.size" [style.height.px]="f.size" [style.opacity]="f.opacity" [style.transform]="'translate3d(' + f.x + 'px,' + f.y + 'px,0) rotate(' + f.rotate + 'rad)'" />
            }
            <div class="shadow" [style.left.px]="s.shadow.x" [style.top.px]="s.shadow.y" [style.width.px]="s.shadow.w" [style.height.px]="s.shadow.h"></div>
            <img class="pic hero" [src]="'icons3d/' + s.hero.icon + '.webp'" alt="" draggable="false" [style.width.px]="s.hero.size" [style.height.px]="s.hero.size" [style.transform]="'translate3d(' + s.hero.x + 'px,' + s.hero.y + 'px,0) rotate(' + s.hero.rotate + 'rad)'" />
          </div>
        }
      </section>

      <section class="card">
        <svg class="wave side" viewBox="0 0 46 100" preserveAspectRatio="none" aria-hidden="true"><path d="M32,0 C0,22 46,42 24,62 C6,78 12,90 28,100 L46,100 L46,0 Z" /></svg>
        <svg class="wave top" viewBox="0 -6 100 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0,26 C22,-6 42,40 62,18 C78,0 90,6 100,22 L100,40 L0,40 Z" /></svg>

        <div class="dots-row">
          <div class="dots">
            @for (d of dots(); track $index) {
              <button
                type="button"
                class="dot"
                [style.width.px]="d.width"
                [style.background]="d.color"
                [attr.aria-label]="t(words.page) + ' ' + ($index + 1) + ' ' + t(words.of) + ' ' + pages.length"
                [attr.aria-current]="$index === page() ? 'step' : null"
                (click)="goTo($index)"
              ></button>
            }
          </div>
          <span class="count">{{ page() + 1 }} / {{ pages.length }}</span>
        </div>

        <div class="say" aria-live="polite">
          @if (leavingText(); as old) {
            <div class="text out" aria-hidden="true">
              <p class="h1">{{ say(pages[old.page].title, old.lang) }}</p>
              <p>{{ say(pages[old.page].body, old.lang) }}</p>
            </div>
          }
          @for (key of [textKey()]; track key) {
            <div class="text">
              <h1>{{ t(pages[page()].title) }}</h1>
              <p>{{ t(pages[page()].body) }}</p>
            </div>
          }
        </div>

        <div class="go">
          <button type="button" class="next" [class.last]="last()" (click)="next()" [attr.aria-label]="last() ? t(words.start) : t(words.next)">
            @if (!last()) {
              <svg class="progress" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="28" class="track" />
                <circle cx="32" cy="32" r="28" class="fill" [attr.stroke-dasharray]="progress()" transform="rotate(-90 32 32)" />
              </svg>
            } @else {
              <span class="label">{{ t(words.start) }}</span>
            }
            <svg class="arrow" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; }
    .welcome {
      position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden; color: #163C3B;
      display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(400px, 1fr);
      transition: opacity .38s ease, transform .38s ease;
    }
    .welcome.leaving { opacity: 0; transform: translateY(-1.5%); }
    .bg { position: absolute; inset: 0; }
    .bar {
      position: absolute; z-index: 5; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 18px 24px; pointer-events: none;
    }
    .bar > * { pointer-events: auto; }
    .lang { display: inline-flex; padding: 3px; background: #fff; border: 1px solid #E8E0CE; border-radius: 99px; }
    .lang button {
      min-height: 36px; padding: 0 14px; border: 0; border-radius: 99px; background: transparent; cursor: pointer;
      font: 700 13px var(--font); color: #163C3B; transition: background .16s, color .16s;
    }
    .lang button.on { background: #146B60; color: #fff; }
    .lang button:focus-visible, .dot:focus-visible { outline: 3px solid #163C3B; outline-offset: 2px; }

    .stage { position: relative; z-index: 1; overflow: hidden; min-height: 100%; touch-action: pan-y; cursor: grab; user-select: none; }
    .stage:active { cursor: grabbing; }
    .confetti { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .scene { position: absolute; inset: 0; will-change: transform; }
    .glow, .burst, .ring, .shadow { position: absolute; pointer-events: none; }
    .glow { border-radius: 50%; }
    .burst { opacity: .35; }
    .ring { overflow: visible; }
    .shadow { border-radius: 50%; background: rgba(0, 0, 0, .18); filter: blur(12px); }
    .pic { position: absolute; left: 0; top: 0; pointer-events: none; -webkit-user-drag: none; }

    .card {
      position: relative; z-index: 3; background: #fff; display: flex; flex-direction: column; justify-content: center; gap: 18px;
      padding: 104px clamp(28px, 4vw, 64px) 56px;
    }
    .wave { position: absolute; fill: #fff; pointer-events: none; overflow: visible; }
    .wave.side { left: -45px; top: 0; width: 46px; height: 100%; }
    .wave.top { display: none; }
    .dots-row { display: flex; align-items: center; gap: 12px; }
    .dots { display: flex; gap: 6px; align-items: center; }
    .dot { height: 10px; padding: 0; border: 0; border-radius: 9px; cursor: pointer; }
    .count { margin-left: auto; font: 700 13px var(--font); color: #55706E; font-variant-numeric: tabular-nums; }
    .say { position: relative; min-height: 9.5em; }
    .text { max-width: 30em; animation: text-in .28s ease-out .08s both; }
    .text.out { position: absolute; inset: 0 auto auto 0; animation: text-out .16s ease-in both; pointer-events: none; }
    h1, .text p.h1 { font-family: var(--serif); font-weight: 700; font-size: clamp(30px, 3.1vw, 42px); line-height: 1.15; color: #163C3B; text-wrap: balance; margin: 0; }
    .text p { margin-top: 10px; font-size: 17px; line-height: 1.55; color: #55706E; }
    .go { display: flex; justify-content: flex-end; }
    .next {
      position: relative; height: 68px; width: 68px; border: 0; border-radius: 40px; cursor: pointer; color: #fff;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--accent); box-shadow: 0 8px 18px var(--accent-glow);
      transition: width .38s cubic-bezier(.34, 1.56, .64, 1);
    }
    .next.last { width: 220px; }
    .next:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    .progress { position: absolute; left: 2px; top: 2px; width: 64px; height: 64px; }
    .progress circle { fill: none; stroke-width: 3; }
    .progress .track { stroke: rgba(255, 255, 255, .25); }
    .progress .fill { stroke: #fff; stroke-linecap: round; }
    .label { font: 700 18px var(--font); letter-spacing: .03em; white-space: nowrap; }
    .arrow { flex: none; position: relative; }
    @keyframes text-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
    @keyframes text-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(-12px); } }

    @media (max-width: 899px) {
      .welcome { display: flex; flex-direction: column; }
      .bar { position: relative; padding: 12px 16px 0; }
      .stage { flex: 1 1 auto; min-height: 340px; }
      .card { justify-content: flex-start; gap: 14px; padding: 36px 24px 24px; }
      .wave.side { display: none; }
      .wave.top { display: block; left: 0; top: -34px; width: 100%; height: 40px; }
      .say { min-height: 8.5em; }
      h1, .text p.h1 { font-size: 28px; }
      .text p { font-size: 16px; }
      .logo { transform: scale(.82); transform-origin: right center; }
    }
    @media (prefers-reduced-motion: reduce) {
      .text { animation: none; }
      .text.out { display: none; }
      .next { transition: none; }
    }
  `,
})
export class Welcome {
  private readonly router = inject(Router);
  readonly step = input<string>('1');
  readonly pages = PAGES;
  readonly words = WORDS;
  readonly sunburst = SUNBURST_PATH;
  readonly reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly lang = signal<Lang>(startLanguage());
  readonly pos = signal(indexOf(this.step()));
  readonly loop = signal(0.15);
  readonly sw = signal(800);
  readonly sh = signal(700);
  readonly leaving = signal(false);

  readonly page = computed(() => Math.min(PAGES.length - 1, Math.max(0, Math.round(this.pos()))));
  readonly last = computed(() => this.page() === PAGES.length - 1);
  readonly colors = computed(() => colorsAt(Math.min(PAGES.length - 1, Math.max(0, this.pos()))));
  readonly scenes = computed(() =>
    PAGES.map((_, k) => scene(k, this.pos(), this.sw(), this.sh(), this.loop(), this.reduced)).filter((s) => (this.reduced ? s.opacity > 0.01 : Math.abs(s.k - this.pos()) < 1.15)),
  );
  readonly bits = computed(() => confetti(this.reduced ? 0.3 : this.loop(), this.sw(), this.sh()));
  readonly dots = computed(() => PAGES.map((_, d) => dot(d, this.pos(), this.colors().accent)));
  readonly progress = computed(() => {
    const circ = 2 * Math.PI * 28;
    return `${(Math.min(PAGES.length, Math.max(0, this.pos() + 1)) / PAGES.length) * circ} ${circ}`;
  });
  readonly textKey = computed(() => `${this.page()}-${this.lang()}`);
  /** The words that were showing, fading out while the new ones come in (like the phone's AnimatedSwitcher). */
  readonly leavingText = signal<{ page: number; lang: Lang } | null>(null);
  private shown = { page: this.page(), lang: this.lang() };
  private textTimer: ReturnType<typeof setTimeout> | undefined;
  readonly say = say;

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private tween: { from: number; to: number; start: number; dur: number } | null = null;
  private dragging: { id: number; x0: number; pos0: number; page0: number; lastX: number; lastT: number; v: number; moved: boolean } | null = null;
  private raf = 0;

  constructor() {
    const destroy = inject(DestroyRef);
    // The pictures load before the first move, so nothing pops in late.
    for (const icon of ALL_ICONS) {
      const img = new Image();
      img.src = `icons3d/${icon}.webp`;
    }
    afterNextRender(() => {
      const el = this.stage()?.nativeElement;
      if (el) {
        const set = () => {
          this.sw.set(Math.max(280, el.clientWidth));
          this.sh.set(Math.max(280, el.clientHeight));
        };
        set();
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(set);
          ro.observe(el);
          destroy.onDestroy(() => ro.disconnect());
        }
      }
      const begin = performance.now();
      const tick = (now: number) => {
        if (!this.reduced) this.loop.set((((now - begin) / LOOP_MS) + 0.15) % 1);
        if (this.tween) {
          const p = Math.min(1, (now - this.tween.start) / this.tween.dur);
          this.pos.set(this.tween.from + (this.tween.to - this.tween.from) * easeInOutCubic(p));
          if (p >= 1) {
            this.pos.set(this.tween.to);
            this.tween = null;
            this.syncUrl();
          }
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
    destroy.onDestroy(() => cancelAnimationFrame(this.raf));

    // When the page or the language changes, the old words fade out as the new ones fade in.
    effect(() => {
      const now = { page: this.page(), lang: this.lang() };
      untracked(() => {
        if (now.page === this.shown.page && now.lang === this.shown.lang) return;
        this.leavingText.set(this.shown);
        this.shown = now;
        clearTimeout(this.textTimer);
        this.textTimer = setTimeout(() => this.leavingText.set(null), 300);
      });
    });
    destroy.onDestroy(() => clearTimeout(this.textTimer));

    // The browser's back and forward buttons move between the pages too.
    effect(() => {
      const want = indexOf(this.step());
      untracked(() => {
        if (!this.tween && !this.dragging && want !== Math.round(this.pos())) this.goTo(want);
      });
    });
  }

  t(p: readonly [string, string]): string {
    return say(p, this.lang());
  }

  deg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  setLang(l: Lang): void {
    this.lang.set(l);
    local.set('welcomeLang', l);
  }

  goTo(i: number): void {
    const to = Math.min(PAGES.length - 1, Math.max(0, i));
    const from = this.pos();
    if (Math.abs(to - from) < 0.001) return;
    const dur = this.reduced ? 220 : Math.max(240, PAGE_MS * Math.min(1.4, Math.abs(to - from)));
    this.tween = { from, to, start: performance.now(), dur };
  }

  next(): void {
    if (this.leaving()) return;
    if (this.last() && !this.tween) return this.finish();
    this.goTo(Math.round(this.tween ? this.tween.to : this.pos()) + 1);
  }

  prev(): void {
    this.goTo(Math.round(this.tween ? this.tween.to : this.pos()) - 1);
  }

  @HostListener('document:keydown', ['$event'])
  key(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!this.last()) this.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    }
  }

  // ---------- dragging and swiping the pictures ----------

  down(e: PointerEvent): void {
    if (e.button !== 0 || this.leaving()) return;
    this.tween = null;
    const p = this.pos();
    this.dragging = { id: e.pointerId, x0: e.clientX, pos0: p, page0: Math.round(p), lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  drag(e: PointerEvent): void {
    const d = this.dragging;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (Math.abs(dx) > 4) d.moved = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.7 * d.v + 0.3 * (((e.clientX - d.lastX) / this.sw()) * (1000 / dt));
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    this.pos.set(rubber(d.pos0 - dx / this.sw()));
  }

  up(e: PointerEvent): void {
    const d = this.dragging;
    if (!d || e.pointerId !== d.id) return;
    this.dragging = null;
    if (!d.moved) return this.goTo(d.page0);
    // Dragging to the left (a negative speed on screen) heads for the next page.
    this.goTo(settle(this.pos(), d.page0, d.v));
  }

  private syncUrl(): void {
    const want = String(this.page() + 1);
    if (this.step() !== want) void this.router.navigate(['/welcome', want], { replaceUrl: true });
  }

  private finish(): void {
    local.set('welcomeSeen', true);
    this.leaving.set(true);
    setTimeout(() => void this.router.navigateByUrl('/sign-in'), this.reduced ? 0 : 380);
  }
}

function indexOf(step: string): number {
  const n = Number(step);
  return Number.isInteger(n) && n >= 1 && n <= PAGES.length ? n - 1 : 0;
}

/** Like the phone: the language chosen before, otherwise the browser's language. */
function startLanguage(): Lang {
  const saved = local.get<Lang | null>('welcomeLang', null);
  if (saved === 'en' || saved === 'fil') return saved;
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase() : '';
  return nav.startsWith('fil') || nav.startsWith('tl') ? 'fil' : 'en';
}
