import { ApplicationRef, Component, DestroyRef, ElementRef, HostListener, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { local } from '../../core/storage';
import { Logo } from '../../shared/logo';
import { WelcomeDevices } from './welcome-devices';
import { arrival } from '../../core/arrival';
import { Lang, PAGES, WORDS, cardAt, colorsAt, dot, easeInOutCubic, mix, morphTargets, rubber, say, settle } from './welcome-motion';

const PAGE_MS = 520;
/** On wide screens the card crosses more than half the screen, so a page turn takes a little longer. */
const PAGE_MS_WIDE = 640;
const WIDE = '(min-width: 900px)';

/**
 * W1–W3 Welcome pages, the same as the mobile app's: soft sun, sky and mint pages, a white card with a wave
 * edge, and the same motion when moving between pages (colours blend, dots stretch, the round button fills,
 * then opens). The web's own pictures: a laptop with the real teacher and admin portal, and the Android phone
 * with the child's lessons (welcome-devices.ts). On wide screens the card trades sides each page (right, left,
 * right) and the devices glide under it to the other side, turning to face the words; on phones they stay above
 * the words, small.
 */
@Component({
  selector: 'pl-welcome',
  imports: [Logo, WelcomeDevices],
  template: `
    <main
      #main
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
        <!-- The laptop and the phone: on the free side of the card, gliding under it to the other side between pages. -->
        <pl-welcome-devices [pos]="pos()" [wide]="wide()" [sw]="sw()" [sh]="sh()" [card]="card()" [lang]="lang()" [reduced]="reduced" [exit]="exit()" />
      </section>

      <!-- On wide screens the card trades sides each page (right, left, right) and glides across between them. -->
      <section
        #cardEl
        class="card"
        [style.width.px]="wide() ? card().width : null"
        [style.transform]="wide() ? 'translate3d(' + card().x + 'px,0,0)' : null"
        [style.opacity]="wide() && card().opacity < 1 ? card().opacity : null"
      >
        <svg class="wave side l" viewBox="0 0 46 100" preserveAspectRatio="none" aria-hidden="true"><path d="M32,0 C0,22 46,42 24,62 C6,78 12,90 28,100 L46,100 L46,0 Z" /></svg>
        <svg class="wave side r" viewBox="0 0 46 100" preserveAspectRatio="none" aria-hidden="true"><path d="M32,0 C0,22 46,42 24,62 C6,78 12,90 28,100 L46,100 L46,0 Z" /></svg>
        <svg class="wave top" viewBox="0 -6 100 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0,26 C22,-6 42,40 62,18 C78,0 90,6 100,22 L100,40 L0,40 Z" /></svg>

        <div class="card-in">
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
            <span class="count" [style.--num-y.px]="textDir() < 0 ? -9 : 9">
              @for (k of [page()]; track k) {<span class="num">{{ k + 1 }}</span>} / {{ pages.length }}
            </span>
          </div>

          <!--
            The words change in layers: the block slides in from the side it is coming from, the title's words
            rise into place one after another, then the sentence is written in from left to right.
          -->
          <div class="say" aria-live="polite" [style.--in-x.px]="textDir() * 26" [style.--out-x.px]="textDir() * -14">
            @if (leavingText(); as old) {
              <div class="text out" aria-hidden="true">
                <p class="h1">
                  @for (w of split(say(pages[old.page].title, old.lang)); track $index) {<span class="w" [style.--i]="$index">{{ w }}</span>{{ ' ' }}}
                </p>
                <p class="body">{{ say(pages[old.page].body, old.lang) }}</p>
              </div>
            }
            @for (key of [textKey()]; track key) {
              <div class="text">
                <h1>
                  <span class="sr-only">{{ t(pages[page()].title) }}</span>
                  <span aria-hidden="true">
                    @for (w of split(t(pages[page()].title)); track $index) {<span class="w" [style.--i]="$index">{{ w }}</span>{{ ' ' }}}
                  </span>
                </h1>
                <p class="body" [style.--n]="split(t(pages[page()].title)).length">{{ t(pages[page()].body) }}</p>
              </div>
            }
          </div>

          <div class="go">
            <!-- Back fades in as page 2 comes in (it follows a drag too); page 1 has nowhere to go back to. -->
            <button
              #backBtn
              type="button"
              class="back"
              [style.opacity]="backness()"
              [style.transform]="reduced ? null : 'translateX(' + (1 - backness()) * 14 + 'px) scale(' + (0.86 + 0.14 * backness()) + ')'"
              [style.visibility]="backness() < 0.02 ? 'hidden' : null"
              [style.pointer-events]="backness() < 0.5 ? 'none' : null"
              [attr.tabindex]="page() === 0 ? -1 : null"
              [attr.aria-hidden]="page() === 0 ? 'true' : null"
              [attr.aria-label]="t(words.back)"
              (click)="back()"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button #nextBtn type="button" class="next" [class.last]="last()" (click)="next()" [attr.aria-label]="last() ? t(words.start) : t(words.next)">
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
        </div>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; }
    .welcome {
      position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden; color: #163C3B;
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

    /* Wide screens: the pictures fill the screen and the white card lies on top, on one side or the other. */
    .stage { position: absolute; inset: 0; z-index: 1; overflow: hidden; touch-action: pan-y; cursor: grab; user-select: none; }
    .stage:active { cursor: grabbing; }

    /* Not the portal's boxed .card: a full-height sheet with no border, corners or shadow, so the seams stay clean. */
    .card {
      position: absolute; z-index: 3; top: 0; bottom: 0; left: 0; will-change: transform;
      background: #fff; padding: 0; border: 0; border-radius: 0; box-shadow: none;
    }
    .card-in {
      height: 100%; overflow-y: auto; display: flex; flex-direction: column; justify-content: safe center; gap: 18px;
      padding: 104px clamp(28px, 4vw, 64px) 56px;
    }
    .wave { position: absolute; fill: #fff; pointer-events: none; overflow: visible; }
    /* A wave on both edges: the one facing the pictures shows, the other is off screen (both show mid-glide). */
    .wave.side { top: 0; width: 46px; height: 100%; }
    .wave.side.l { left: -45px; }
    .wave.side.r { right: -45px; transform: rotate(180deg); }
    .wave.top { display: none; }
    .dots-row { display: flex; align-items: center; gap: 12px; }
    .dots { display: flex; gap: 6px; align-items: center; }
    .dot { height: 10px; padding: 0; border: 0; border-radius: 9px; cursor: pointer; }
    .count { margin-left: auto; font: 700 13px var(--font); color: #55706E; font-variant-numeric: tabular-nums; }
    .num { display: inline-block; animation: num-in .45s cubic-bezier(.16, 1, .3, 1) both; }
    .say { position: relative; min-height: 9.5em; }

    /* Layer 1: the whole block slides in from the side it comes from (and the old one slips away the other way). */
    .text { max-width: 30em; animation: text-in .5s cubic-bezier(.16, 1, .3, 1) both; }
    .text.out { position: absolute; inset: 0 auto auto 0; animation: text-out .26s ease-in both; pointer-events: none; }
    h1, .text p.h1 { font-family: var(--serif); font-weight: 700; font-size: clamp(30px, 3.1vw, 42px); line-height: 1.15; color: #163C3B; text-wrap: balance; margin: 0; }
    .text p.body { margin-top: 10px; font-size: 17px; line-height: 1.55; color: #55706E; }
    /* Layer 2: the title's words rise into place one after another, coming into focus; the old words lift away. */
    .w { display: inline-block; }
    .text:not(.out) .w { animation: word-in .56s cubic-bezier(.16, 1, .3, 1) both; animation-delay: calc(.05s + var(--i) * .045s); }
    .text.out .w { animation: word-out .22s ease-in both; animation-delay: calc(var(--i) * .02s); }
    /* Layer 3: after the title, the sentence is written in from left to right behind a soft edge. */
    .text:not(.out) .body {
      -webkit-mask-image: linear-gradient(100deg, #000 42%, transparent 58%); mask-image: linear-gradient(100deg, #000 42%, transparent 58%);
      -webkit-mask-size: 280% 100%; mask-size: 280% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
      animation: write-on .8s cubic-bezier(.33, 1, .68, 1) both; animation-delay: calc(.16s + var(--n) * .045s);
    }

    .go { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .back {
      flex: none; width: 54px; height: 54px; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
      background: #fff; color: var(--accent); border: 2px solid color-mix(in srgb, var(--accent) 45%, #fff);
      transition: background .16s, border-color .16s;
    }
    .back:hover { background: color-mix(in srgb, var(--accent) 9%, #fff); border-color: var(--accent); }
    .back:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
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
    @keyframes text-in { from { opacity: 0; transform: translateX(var(--in-x, 26px)); } to { opacity: 1; transform: none; } }
    @keyframes text-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(var(--out-x, -14px)); } }
    @keyframes word-in { from { opacity: 0; transform: translateY(.6em) rotate(2deg); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
    @keyframes word-out { to { opacity: 0; transform: translateY(-.45em); filter: blur(4px); } }
    @keyframes write-on { from { -webkit-mask-position: 100% 0; mask-position: 100% 0; } to { -webkit-mask-position: 0 0; mask-position: 0 0; } }
    @keyframes num-in { from { opacity: 0; transform: translateY(var(--num-y, 9px)); } to { opacity: 1; transform: none; } }

    /* Phones and narrow windows: pictures on top, words below, like the mobile app (no trading sides). */
    @media (max-width: 899px) {
      .welcome { display: flex; flex-direction: column; }
      .bar { position: relative; padding: 12px 16px 0; }
      .stage { position: relative; inset: auto; flex: 1 1 auto; min-height: 250px; }
      .card { position: relative; top: auto; bottom: auto; }
      .card-in { height: auto; overflow: visible; justify-content: flex-start; gap: 14px; padding: 36px 24px 24px; }
      .wave.side { display: none; }
      .wave.top { display: block; left: 0; top: -34px; width: 100%; height: 40px; }
      .say { min-height: 8.5em; }
      h1, .text p.h1 { font-size: 28px; }
      .text p.body { font-size: 16px; }
      .back { width: 50px; height: 50px; }
      .logo { transform: scale(.82); transform-origin: right center; }
    }
    @media (prefers-reduced-motion: reduce) {
      .text, .num, .text:not(.out) .w, .text:not(.out) .body { animation: none; }
      .text.out { display: none; }
      .next, .back { transition: none; }
    }
  `,
})
export class Welcome {
  private readonly router = inject(Router);
  readonly step = input<string>('1');
  readonly pages = PAGES;
  readonly words = WORDS;
  readonly reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly lang = signal<Lang>(startLanguage());
  readonly pos = signal(indexOf(this.step()));
  // Start from the window size so the card is in place on the first frame (the stage is measured after).
  readonly sw = signal(typeof innerWidth === 'number' ? innerWidth : 800);
  readonly sh = signal(typeof innerHeight === 'number' ? innerHeight : 700);
  readonly leaving = signal(false);
  /** Wide screens put the card beside the pictures and let it trade sides; narrow ones stack them like the phone. */
  readonly wide = signal(typeof matchMedia !== 'undefined' ? matchMedia(WIDE).matches : true);

  readonly page = computed(() => Math.min(PAGES.length - 1, Math.max(0, Math.round(this.pos()))));
  readonly last = computed(() => this.page() === PAGES.length - 1);
  readonly colors = computed(() => colorsAt(Math.min(PAGES.length - 1, Math.max(0, this.pos()))));
  readonly card = computed(() => cardAt(this.pos(), this.sw(), this.reduced));
  readonly dots = computed(() => PAGES.map((_, d) => dot(d, this.pos(), this.colors().accent)));
  readonly progress = computed(() => {
    const circ = 2 * Math.PI * 28;
    return `${(Math.min(PAGES.length, Math.max(0, this.pos() + 1)) / PAGES.length) * circ} ${circ}`;
  });
  readonly textKey = computed(() => `${this.page()}-${this.lang()}`);
  /** Which way the words move: 1 = to the next page, -1 = back, 0 = the language changed (no sliding). */
  readonly textDir = signal(1);
  /** The back button comes in with page 2 (0 on page 1, 1 from page 2 on), following a drag too. */
  readonly backness = computed(() => Math.min(1, Math.max(0, this.pos())));
  /** The words that were showing, fading out while the new ones come in (like the phone's AnimatedSwitcher). */
  readonly leavingText = signal<{ page: number; lang: Lang } | null>(null);
  private shown = { page: this.page(), lang: this.lang() };
  private textTimer: ReturnType<typeof setTimeout> | undefined;
  readonly say = say;

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly mainEl = viewChild<ElementRef<HTMLElement>>('main');
  private readonly cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');
  private readonly appRef = inject(ApplicationRef);
  /** "Get started": 0 → 1 while the page turns into the sign-in page. */
  readonly exit = signal(0);
  private morphing = false;
  private readonly nextBtn = viewChild<ElementRef<HTMLButtonElement>>('nextBtn');
  private tween: { from: number; to: number; start: number; dur: number } | null = null;
  private dragging: { id: number; x0: number; pos0: number; page0: number; lastX: number; lastT: number; v: number; moved: boolean } | null = null;
  private raf = 0;

  constructor() {
    const destroy = inject(DestroyRef);
    if (typeof matchMedia !== 'undefined') {
      const mq = matchMedia(WIDE);
      const onChange = () => this.wide.set(mq.matches);
      mq.addEventListener('change', onChange);
      destroy.onDestroy(() => mq.removeEventListener('change', onChange));
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
      const tick = (now: number) => {
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

  /** A title's words, so each can rise into place on its own. */
  split(s: string): string[] {
    return s.split(/\s+/).filter(Boolean);
  }

  setLang(l: Lang): void {
    if (l === this.lang()) return;
    this.textDir.set(0);
    this.lang.set(l);
    local.set('welcomeLang', l);
  }

  goTo(i: number): void {
    const to = Math.min(PAGES.length - 1, Math.max(0, i));
    const from = this.pos();
    if (Math.abs(to - from) < 0.001) return;
    this.textDir.set(to > from ? 1 : -1);
    const dur = this.reduced ? 220 : Math.max(240, (this.wide() ? PAGE_MS_WIDE : PAGE_MS) * Math.min(1.4, Math.abs(to - from)));
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

  /** The ← button. On page 1 it hides, so the keyboard focus moves to the round Next button instead of getting lost. */
  back(): void {
    const target = Math.round(this.tween ? this.tween.to : this.pos()) - 1;
    this.prev();
    if (target <= 0) this.nextBtn()?.nativeElement.focus({ preventScroll: true });
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
    if (Math.abs(dx) > 4) {
      d.moved = true;
      this.textDir.set(dx < 0 ? 1 : -1); // dragging left heads for the next page
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    const span = this.span();
    d.v = 0.7 * d.v + 0.3 * (((e.clientX - d.lastX) / span) * (1000 / dt));
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    this.pos.set(rubber(d.pos0 - dx / span));
  }

  /** How far a drag goes for one page: the card's trip across on wide screens, the picture's width when stacked. */
  private span(): number {
    return Math.max(280, this.wide() ? this.card().travel : this.sw());
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
    if (this.morphToSignIn()) return;
    this.leaving.set(true);
    setTimeout(() => void this.router.navigateByUrl('/sign-in'), this.reduced ? 0 : 380);
  }

  /**
   * "Get started" on the last page: everything on the page moves to its place on the sign-in page (0.9 s).
   * The pill grows into the sign-in card, turning white; the card widens (on phones: rises) as the green side
   * narrows into the sign-in panel; the logo flies to the panel's corner; the laptop glides onto the panel's ring,
   * its screen becoming the teacher's dashboard, the phone slipping behind it. Then the real sign-in page takes
   * over: a short view transition settles the card and the logo exactly and fades in the rest (styles.scss).
   * Reduced motion keeps the plain fade; without view transitions the page simply changes at the end.
   */
  private morphToSignIn(): boolean {
    const main = this.mainEl()?.nativeElement;
    const card = this.cardEl()?.nativeElement;
    const cta = this.nextBtn()?.nativeElement;
    const logo = main?.querySelector<HTMLElement>('.bar .logo');
    if (this.reduced || !main || !card || !cta || !logo) return false;
    if (this.morphing) return true;
    this.morphing = true;
    main.style.pointerEvents = 'none';
    const wide = this.wide();
    const W = innerWidth;
    const H = innerHeight;
    const to = morphTargets(W, H, wide);
    const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
    const clamp = (x: number) => Math.min(1, Math.max(0, x));

    // The pill: a copy grows from where the button is (it keeps the page's styles); the button itself hides.
    const b = cta.getBoundingClientRect();
    const pill = cta.cloneNode(true) as HTMLElement;
    pill.removeAttribute('aria-label');
    pill.setAttribute('aria-hidden', 'true');
    Object.assign(pill.style, { position: 'fixed', zIndex: '8', margin: '0', transition: 'none', left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`, overflow: 'hidden' });
    main.appendChild(pill);
    cta.style.visibility = 'hidden';
    const label = [...pill.children] as HTMLElement[];
    const accent = getComputedStyle(cta).backgroundColor;
    // Inside it, a soft outline of the sign-in form fades in as it grows; the real form sharpens into it.
    const skeleton = document.createElement('div');
    const bar = (w: string, h: number, top: number, extra = '') => `<i style="display:block;width:${w};height:${h}px;margin-top:${top}px;border-radius:${h > 20 ? 10 : 6}px;${extra}"></i>`;
    skeleton.innerHTML = [
      bar('100%', 46, 0, 'border-radius:999px;background:#F1EFE8'),
      bar('58%', 30, 24, 'background:#DCE8E3'),
      bar('86%', 12, 12, 'background:#ECEFEA'),
      bar('18%', 12, 28, 'background:#E4E9E5'),
      bar('100%', 44, 8, 'border:1px solid #E3E6E1;box-sizing:border-box'),
      bar('24%', 12, 16, 'background:#E4E9E5'),
      bar('100%', 44, 8, 'border:1px solid #E3E6E1;box-sizing:border-box'),
      bar('100%', 46, 16, `background:${accent};opacity:.9`),
      bar('100%', 118, 20, 'background:#F6F7F4;border:1px solid #ECEEE9;box-sizing:border-box'),
    ].join('');
    Object.assign(skeleton.style, { position: 'absolute', left: '28px', right: '28px', top: '28px', opacity: '0', pointerEvents: 'none' });
    pill.appendChild(skeleton);

    // The logo: a copy flies from the top corner to the green panel's corner, growing to the panel's size.
    const l = logo.getBoundingClientRect();
    const flyer = logo.cloneNode(true) as HTMLElement;
    flyer.classList.remove('logo');
    Object.assign(flyer.style, { position: 'fixed', zIndex: '8', left: '0', top: '0', transformOrigin: '0 0', margin: '0' });
    main.appendChild(flyer);
    const natural = flyer.getBoundingClientRect().height || l.height;
    logo.style.visibility = 'hidden';
    const k0 = l.height / natural;
    const k1 = to.logo.height / natural;

    // Wide: the card itself widens. Phones: a white sheet rises over the card, its wave flattening.
    const c = card.getBoundingClientRect();
    const fade = [card.querySelector<HTMLElement>('.card-in'), main.querySelector<HTMLElement>('.bar .lang')].filter((e): e is HTMLElement => !!e);
    const wave = card.querySelector<HTMLElement>(wide ? '.wave.side.l' : '.wave.top');
    let sheet: HTMLElement | null = null;
    if (!wide) {
      sheet = document.createElement('div');
      sheet.setAttribute('aria-hidden', 'true');
      sheet.innerHTML = '<svg viewBox="0 -6 100 46" preserveAspectRatio="none" style="position:absolute;left:0;top:-34px;width:100%;height:40px;fill:#fff;overflow:visible"><path d="M0,26 C22,-6 42,40 62,18 C78,0 90,6 100,22 L100,40 L0,40 Z"/></svg>';
      Object.assign(sheet.style, { position: 'fixed', zIndex: '7', left: '0', right: '0', top: `${c.top}px`, height: `${H + 60}px`, background: '#fff' });
      main.appendChild(sheet);
    }
    if (wave) wave.style.transformOrigin = wide ? '100% 50%' : '50% 100%';

    const start = performance.now();
    const DUR = 900;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      const e = easeInOutCubic(p);
      const gone = clamp(1 - p * 4); // the words, dots and buttons leave first
      for (const el of fade) el.style.opacity = String(gone);
      if (wide) {
        card.style.transform = `translate3d(${lerp(c.left, to.card.x, e)}px, 0, 0)`;
        card.style.width = `${lerp(c.width, to.card.width, e)}px`;
        if (wave) wave.style.transform = `scaleX(${1 - e})`; // the wave straightens into the panel's edge
      } else if (sheet) {
        sheet.style.top = `${lerp(c.top, to.card.top, e)}px`;
        const w = sheet.firstElementChild as SVGElement;
        w.style.transform = `scaleY(${1 - e})`;
        w.style.transformOrigin = '50% 100%';
      }
      // The pill grows into the card and turns white; its words fade as it grows.
      pill.style.left = `${lerp(b.left, to.form.x, e)}px`;
      pill.style.top = `${lerp(b.top, to.form.y, e)}px`;
      pill.style.width = `${lerp(b.width, to.form.w, e)}px`;
      pill.style.height = `${lerp(b.height, to.form.h, e)}px`;
      pill.style.borderRadius = `${lerp(b.height / 2, 18, e)}px`;
      const white = 1 - Math.pow(1 - clamp((p - 0.06) / 0.34), 3); // quickly to white, so it never sits grey-green
      pill.style.background = white > 0 ? mixRgb(accent, '#ffffff', white) : '';
      pill.style.boxShadow = `0 ${lerp(8, 8, e)}px ${lerp(18, 24, e)}px ${lerp(0, -12, e)}px rgba(22, 60, 59, ${lerp(0.3, 0.18, e)}), 0 0 0 ${white}px rgba(232, 225, 209, ${white})`;
      for (const part of label) part.style.opacity = String(clamp(1 - p * 3.5));
      skeleton.style.opacity = String(clamp((p - 0.38) / 0.36));
      // The logo flies to the panel's corner.
      const k = lerp(k0, k1, e);
      flyer.style.transform = `translate(${lerp(l.left, to.logo.x, e)}px, ${lerp(l.top, to.logo.y, e)}px) scale(${k})`;
      // The laptop and phone travel onto the panel (welcome-devices.ts).
      this.exit.set(p);
      // Nearly there (97% of the way): the real page takes over and settles the rest.
      if (p < 0.8) requestAnimationFrame(step);
      else this.handOver(pill, flyer);
    };
    requestAnimationFrame(step);
    return true;
  }

  /** The real sign-in page takes over: the card and the logo settle exactly onto it, the rest fades across. */
  private handOver(pill: HTMLElement, flyer: HTMLElement): void {
    arrival.fromWelcome = true;
    const doc = document as Document & { startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> } };
    if (typeof doc.startViewTransition !== 'function') {
      void this.router.navigateByUrl('/sign-in');
      return;
    }
    pill.style.setProperty('view-transition-name', 'vt-form');
    (flyer.querySelector('img') ?? flyer).style.setProperty('view-transition-name', 'vt-logo');
    const root = document.documentElement;
    root.dataset['wt'] = 'morph';
    const done = () => {
      delete root.dataset['wt'];
    };
    doc
      .startViewTransition(async () => {
        await this.router.navigateByUrl('/sign-in');
        await this.appRef.whenStable();
      })
      .finished.then(done, done);
  }

}

/** A colour between a computed css rgb()/rgba() colour and a hex colour. */
function mixRgb(from: string, to: string, t: number): string {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(from);
  if (!m) return to;
  const hex = '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
  return mix(hex, to, t);
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
