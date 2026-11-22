import { Component, DestroyRef, ElementRef, HostListener, computed, inject, output, signal, viewChild } from '@angular/core';
import { API_URL } from '../core/api';
import { ConnectionWatch } from '../core/connection';
import { ART_H, ART_W, EXTRA, EXTRA_X, Frame, Geometry, LETTER_COUNT, ORBIT, TOTAL_MS, X0, Y0, easeInCubic, frame, geometry } from './splash-frame';

/** The web plays the phone's 6 s timeline a little faster (teachers open the portal often). */
const SPEED = 1 / 0.8;
const EXIT_MS = 700;
const LAYERS = 'brand/intro/';
const LETTER_SRC = Array.from({ length: LETTER_COUNT }, (_, i) => `${LAYERS}letter-${String(i).padStart(2, '0')}.svg`);
const PRELOAD = [
  ...['icon-base', 'icon-sun', 'icon-front', 'icon-spark', 'bar', 'tagline'].map((n) => `${LAYERS}${n}.svg`),
  ...LETTER_SRC,
  ...ORBIT.map((n) => `icons3d/${n}.webp`),
  'icons3d/rocket.webp',
];
/** Floating sparkles behind the logo (fixed positions, so every visit looks the same). */
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 3 + (i % 4),
  color: ['#F6CC59', '#8FD9C8', '#FFF9ED', '#FFB547'][i % 4],
  delay: -(i * 0.37),
}));

/**
 * W-00 Intro shown once per browser session. Same look as the mobile app's intro (logo flips into the glowing
 * disc, the wordmark bursts out of the pocket, a rocket rides the loading bar). The web twist: it really
 * connects to the Pocket Lessons server while it plays, and says so when there is no internet.
 */
@Component({
  selector: 'pl-splash',
  template: `
    <div class="splash" [class.leaving]="leaving()" [style.clip-path]="clip()" role="dialog" aria-modal="true" aria-label="Pocket Lessons is starting">
      <div class="bg" [style.background]="f().background"></div>
      <div class="confetti" aria-hidden="true" [style.opacity]="f().confetti">
        @for (c of confetti; track $index) {
          <i [style.left.%]="c.left" [style.top.%]="c.top" [style.width.px]="c.size" [style.height.px]="c.size" [style.background]="c.color" [style.animation-delay.s]="c.delay"></i>
        }
      </div>
      <!-- the logo scene moves up when the "no connection" card needs the room -->
      <div class="scene" [style.transform]="'translateY(' + -lift() + 'px)'">
      <div class="burst" aria-hidden="true"
        [style.left.px]="g().cx - g().radius * 1.6" [style.top.px]="g().cy - g().radius * 1.6"
        [style.width.px]="g().radius * 3.2" [style.height.px]="g().radius * 3.2"
        [style.opacity]="f().burst.opacity" [style.transform]="f().burst.transform"></div>

      <!-- the web twist: signal rings pulse out of the disc while it talks to the server -->
      <div class="rings" aria-hidden="true" [class.on]="f().settled" [class.off]="state() === 'offline'" [style.left.px]="g().cx" [style.top.px]="g().cy">
        <span></span><span></span><span></span>
      </div>

      @for (o of f().orbit; track o.src) {
        <img class="orb" [src]="o.src" alt="" [style.width.px]="o.size" [style.height.px]="o.size" [style.transform]="o.transform" [style.opacity]="o.opacity" [class.grey]="state() === 'offline'" />
      }

      <div class="disc" aria-hidden="true" [style.left.px]="g().cx - 78" [style.top.px]="g().cy - 78" [style.transform]="f().disc.transform" [style.box-shadow]="f().disc.shadow">
        @if (f().icon.show) {
          <div class="flip" [style.transform]="f().icon.transform">
            <div class="art">
              <img src="brand/intro/icon-base.svg" alt="" />
              <img class="sun" src="brand/intro/icon-sun.svg" alt="" [style.opacity]="f().icon.sunOpacity" [style.transform]="f().icon.sunTransform" />
              <img src="brand/intro/icon-front.svg" alt="" />
              <img class="spark" src="brand/intro/icon-spark.svg" alt="" [style.transform]="f().icon.sparkTransform" />
            </div>
          </div>
        }
      </div>

      <div class="word" role="img" aria-label="Pocket Lessons – Tuloy Ang Aral. Konektado sa Bawat Sentro."
        [style.left.px]="g().wordLeft" [style.top.px]="g().wordTop" [style.width.px]="g().wordW" [style.height.px]="g().wordH">
        @if (f().wordShow) {
          @for (l of f().letters; track $index) {
            <div class="layer" [style.transform]="l.transform" [style.transform-origin]="l.origin" [style.opacity]="l.opacity" [style.filter]="l.filter">
              <img [src]="letterSrc[$index]" alt="" [style.left.px]="art().left" [style.top.px]="art().top" [style.width.px]="art().w" [style.height.px]="art().h" />
            </div>
          }
          <div class="layer" [style.transform]="f().bar" [style.transform-origin]="barOrigin()" [style.filter]="f().barFilter">
            <img src="brand/intro/bar.svg" alt="" [style.left.px]="art().left" [style.top.px]="art().top" [style.width.px]="art().w" [style.height.px]="art().h" />
          </div>
          <div class="layer" [style.clip-path]="f().tagClip" [style.filter]="f().tagFilter">
            <img src="brand/intro/tagline.svg" alt="" [style.left.px]="art().left" [style.top.px]="art().top" [style.width.px]="art().w" [style.height.px]="art().h" />
          </div>
          <svg class="layer extra" [attr.viewBox]="viewBox()" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="pl-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE58F" /><stop offset="1" stop-color="#F6CC59" /></linearGradient>
            </defs>
            <text [attr.x]="extraX" y="143" font-family="Atkinson Hyperlegible, Segoe UI, sans-serif" font-weight="700" font-size="25" letter-spacing="0.6" fill="url(#pl-gold)">{{ f().extra }}</text>
          </svg>
          @if (f().caret.show) {
            <i class="caret" [style.left.px]="f().caret.left" [style.top.px]="(124 - y0) * g().u" [style.width.px]="3 * g().u" [style.height.px]="26 * g().u"></i>
          }
        }
      </div>
      </div>

      <p class="pill" [attr.data-state]="state()">
        <span class="dot" aria-hidden="true"></span>
        @if (state() !== 'preview') {
          <span class="signal" aria-hidden="true"><i></i><i></i><i></i></span>
        }
        {{ pillText() }}
      </p>
      <button type="button" class="skip" (click)="finish()">Skip intro</button>

      @if (state() !== 'offline') {
        <div class="loader" aria-hidden="true" [style.width.px]="g().barW" [style.opacity]="f().loaderOpacity">
          <div class="track"></div>
          <div class="fill" [style.width.px]="fillW()"></div>
          <img class="rocket" src="icons3d/rocket.webp" alt="" [style.left.px]="g().barW * bar() - 20" [style.top.px]="rocketTop()" />
          <span class="globe" [attr.data-state]="state()">
            <img src="icons3d/globe.webp" alt="" />
            @if (state() === 'online') { <b class="badge ok">✓</b> }
          </span>
        </div>
        <p class="status" role="status" aria-live="polite" [style.opacity]="f().statusOpacity">{{ status() }}</p>
      } @else {
        <div class="offline" role="alert" #card>
          <img src="icons3d/globe.webp" alt="" class="grey" />
          <div>
            <h2>{{ watch.problem() === 'internet' ? 'No internet connection' : 'Cannot reach the Pocket Lessons server' }}</h2>
            <p>
              {{ watch.problem() === 'internet' ? 'The portal needs internet to save your work.' : 'The internet works, but the server is not answering right now.' }}
              Phones keep teaching offline. We will keep trying.
            </p>
            <div class="actions">
              <button type="button" class="btn-sun" (click)="watch.retry()">Try again</button>
              <button type="button" class="btn-line" (click)="finish()">Continue anyway</button>
            </div>
          </div>
        </div>
      }

      @if (state() !== 'offline') {
        <p class="credit">AHA Learning Center <span aria-hidden="true">×</span> UpUp Technologies</p>
      }
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 1000; }
    .splash { position: absolute; inset: 0; overflow: hidden; color: #FFF9ED; background: #0A3F38; }
    .splash.leaving { pointer-events: none; }
    .bg { position: absolute; inset: 0; }
    .scene { position: absolute; inset: 0; pointer-events: none; transition: transform .5s cubic-bezier(.2, .8, .3, 1); }

    .confetti { position: absolute; inset: 0; pointer-events: none; }
    .confetti i { position: absolute; border-radius: 50%; animation: drift 6s ease-in-out infinite; }

    .burst {
      position: absolute; border-radius: 50%; pointer-events: none;
      background: repeating-conic-gradient(from 0deg, #F6CC59 0deg 7deg, transparent 7deg 22.5deg);
      -webkit-mask: radial-gradient(circle, #000 18%, transparent 68%); mask: radial-gradient(circle, #000 18%, transparent 68%);
    }

    .rings { position: absolute; width: 0; height: 0; pointer-events: none; }
    .rings span {
      position: absolute; left: -78px; top: -78px; width: 156px; height: 156px; border-radius: 50%;
      border: 3px solid rgba(246, 204, 89, .65); opacity: 0;
    }
    .rings.on span { animation: ring 2.4s cubic-bezier(.2, .7, .3, 1) infinite; }
    .rings.on span:nth-child(2) { animation-delay: .8s; }
    .rings.on span:nth-child(3) { animation-delay: 1.6s; }
    .rings.off span { animation: none; opacity: .28; border: 2px dashed rgba(210, 230, 223, .6); }
    .rings.off span:nth-child(1) { transform: scale(1.35); }
    .rings.off span:nth-child(2) { transform: scale(1.7); }
    .rings.off span:nth-child(3) { transform: scale(2.05); }

    .orb { position: absolute; left: 0; top: 0; pointer-events: none; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .25)); transition: filter .4s; }
    .orb.grey { filter: grayscale(1) drop-shadow(0 6px 10px rgba(0, 0, 0, .25)); }

    .disc { position: absolute; width: 156px; height: 156px; border-radius: 50%; background: #FFF9ED; display: grid; place-items: center; }
    .flip { width: 96px; height: 108px; position: relative; }
    .art { position: absolute; left: -8.4px; top: -10.8px; width: 390.6px; height: 123.6px; }
    .art img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .art .sun { transform-origin: 56.4px 43.2px; }
    .art .spark { transform-origin: 88.2px 27.6px; }

    .word { position: absolute; }
    .layer { position: absolute; inset: 0; overflow: visible; }
    .layer img { position: absolute; max-width: none; }
    .extra { width: 100%; height: 100%; overflow: visible; }
    .caret { position: absolute; background: #E1F1DD; }

    .pill {
      position: absolute; top: 18px; left: 18px; z-index: 2; display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 999px; font: 700 13px/1 var(--font); color: #D2E6DF;
      background: rgba(255, 249, 237, .08); border: 1px solid rgba(210, 230, 223, .25);
    }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #F6CC59; animation: blink 1.2s ease-in-out infinite; }
    .signal { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
    .signal i { width: 3px; border-radius: 2px; background: currentColor; opacity: .35; }
    .signal i:nth-child(1) { height: 5px; } .signal i:nth-child(2) { height: 8px; } .signal i:nth-child(3) { height: 12px; }
    .pill[data-state='checking'] .signal i { animation: bars 1.2s ease-in-out infinite; }
    .pill[data-state='checking'] .signal i:nth-child(2) { animation-delay: .2s; }
    .pill[data-state='checking'] .signal i:nth-child(3) { animation-delay: .4s; }
    .pill[data-state='online'] { color: #E1F7EC; border-color: rgba(120, 214, 170, .55); }
    .pill[data-state='online'] .dot { background: #4CD08F; animation: none; box-shadow: 0 0 0 4px rgba(76, 208, 143, .2); }
    .pill[data-state='online'] .signal i { opacity: 1; }
    .pill[data-state='offline'] .dot { background: #E07A5F; animation: none; }
    .pill[data-state='preview'] .dot { background: #8CC7E8; animation: none; }

    .skip {
      position: absolute; top: 18px; right: 18px; z-index: 2;
      background: rgba(255, 249, 237, .08); color: #D2E6DF; border: 1px solid rgba(210, 230, 223, .25);
      border-radius: 999px; padding: 8px 16px; font: 700 13px/1 var(--font); cursor: pointer;
    }
    .skip:hover { background: rgba(255, 249, 237, .16); color: #FFF9ED; }
    .skip:focus-visible, .actions button:focus-visible { outline: 3px solid #F6CC59; outline-offset: 2px; }

    .loader { position: absolute; left: 50%; bottom: 84px; height: 44px; transform: translateX(calc(-50% - 22px)); }
    .track { position: absolute; left: 0; right: 0; top: 18px; height: 12px; border-radius: 9px; background: rgba(255, 255, 255, .18); }
    .fill {
      position: absolute; left: 0; top: 18px; height: 12px; border-radius: 9px;
      background: linear-gradient(90deg, #F6CC59, #FFB547); box-shadow: 0 0 12px rgba(246, 204, 89, .6);
    }
    .rocket { position: absolute; width: 40px; height: 40px; transform: rotate(45deg); }
    .globe { position: absolute; right: -58px; top: -2px; width: 46px; height: 46px; }
    .globe img { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0, 0, 0, .3)); }
    .globe[data-state='checking'] img { animation: pulse 1.4s ease-in-out infinite; }
    .badge {
      position: absolute; right: -4px; bottom: -2px; width: 20px; height: 20px; border-radius: 50%;
      display: grid; place-items: center; font: 700 12px/1 var(--font); color: #fff; border: 2px solid #0B3B37;
      animation: pop .4s cubic-bezier(.2, .9, .3, 1.6) both;
    }
    .badge.ok { background: #2E9E6B; }
    .status {
      position: absolute; left: 0; right: 0; bottom: 50px; margin: 0; text-align: center;
      font: 700 14px var(--font); color: #D4ECE7; min-height: 21px;
    }

    .offline {
      position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); width: min(660px, calc(100% - 32px));
      display: flex; gap: 16px; align-items: flex-start; padding: 18px 20px; border-radius: 20px; text-align: left;
      background: rgba(255, 249, 237, .97); color: #163C3B; box-shadow: 0 18px 40px -16px rgba(0, 0, 0, .5);
      animation: rise .4s ease-out both;
    }
    .offline img { width: 48px; height: 48px; flex: none; }
    .grey { filter: grayscale(1); opacity: .7; }
    .offline h2 { margin: 0 0 4px; font: 700 18px var(--serif); }
    .offline p { margin: 0; font-size: 14px; line-height: 1.45; color: #4A5E5B; }
    .actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .actions button { min-height: 40px; padding: 0 16px; border-radius: 999px; font: 700 14px var(--font); cursor: pointer; }
    .btn-sun { background: #F6CC59; color: #163C3B; border: 0; }
    .btn-line { background: transparent; color: #146B60; border: 2px solid #CFE3DC; }

    .credit { position: absolute; bottom: 16px; left: 0; right: 0; margin: 0; text-align: center; font-size: 12.5px; color: rgba(210, 230, 223, .65); letter-spacing: .02em; }

    @keyframes ring { 0% { transform: scale(1); opacity: .85; } 100% { transform: scale(2.6); opacity: 0; } }
    @keyframes drift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
    @keyframes bars { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes rise { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

    @media (max-width: 560px) {
      .credit { display: none; }
      .status { bottom: 30px; }
      .loader { bottom: 64px; }
      .pill { font-size: 12px; padding: 7px 11px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .confetti i, .rings.on span, .dot, .globe img, .signal i { animation: none !important; }
    }
  `,
})
export class Splash {
  readonly done = output<void>();
  readonly watch = new ConnectionWatch(API_URL);
  readonly state = this.watch.state;
  readonly confetti = CONFETTI;
  readonly letterSrc = LETTER_SRC;
  readonly extraX = EXTRA_X;
  readonly y0 = Y0;

  private readonly reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private extraWidth = EXTRA.length * 13.4;
  private ctx: CanvasRenderingContext2D | null = null;

  readonly g = signal<Geometry>(geometry(innerWidth, innerHeight, this.extraWidth));
  readonly f = signal<Frame>(frame(0, 0, this.g(), 0, (s) => this.measure(s)));
  readonly bar = signal(0);
  readonly rocketTop = signal(2);
  readonly clip = signal('none');
  readonly leaving = signal(false);
  readonly lift = signal(0);
  private readonly elapsed = signal(0);
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');

  readonly art = computed(() => {
    const u = this.g().u;
    return { left: -X0 * u, top: -Y0 * u, w: ART_W * u, h: ART_H * u };
  });
  readonly barOrigin = computed(() => `${(202 - X0) * this.g().u}px 0px`);
  readonly viewBox = computed(() => `${X0} ${Y0} ${this.g().span} ${156 - Y0}`);
  readonly fillW = computed(() => Math.max(12, this.g().barW * this.bar()));
  readonly pillText = computed(() => ({ checking: 'Connecting…', online: 'Online', offline: 'Offline', preview: 'Preview mode' })[this.state()]);
  readonly status = computed(() => {
    switch (this.state()) {
      case 'online':
        return 'Connected · Konektado';
      case 'preview':
        return 'Preview mode · your work stays in this browser';
      case 'offline':
        return '';
      default:
        if (this.elapsed() < 1200) return 'Checking your internet…';
        return this.elapsed() * (this.reduced ? 5 : SPEED) >= TOTAL_MS ? 'Still connecting…' : 'Connecting to the Pocket Lessons server…';
    }
  });

  private raf = 0;
  private t0 = 0;
  private last = 0;
  private started = false;
  private exitAt = 0;
  private finished = false;

  constructor() {
    this.watch.start();
    const onResize = () => this.g.set(geometry(innerWidth, innerHeight, this.extraWidth));
    addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.raf);
      removeEventListener('resize', onResize);
      this.watch.stop();
    });
    this.raf = requestAnimationFrame((now) => this.tick(now));
    // Like the phone: load every picture and the font first, so nothing pops in late (at most 1.5 s).
    void this.prepare().then(() => {
      this.g.set(geometry(innerWidth, innerHeight, this.extraWidth));
      this.t0 = performance.now();
      this.started = true;
    });
  }

  @HostListener('document:keydown.escape')
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.leaving.set(true);
    this.exitAt = performance.now();
  }

  private async prepare(): Promise<void> {
    const pictures = PRELOAD.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    });
    const font = document.fonts?.load('700 25px "Atkinson Hyperlegible"').catch(() => undefined);
    await Promise.race([Promise.all([...pictures, font]), new Promise((r) => setTimeout(r, 1500))]);
    const w = this.measure(EXTRA);
    if (w > 0) this.extraWidth = w;
  }

  /** Width of text in the tagline's font, in artwork units (Atkinson Hyperlegible Bold 25, 0.6 letter spacing). */
  private measure(s: string): number {
    if (!this.ctx) {
      this.ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
      if (!this.ctx) return s.length * 13.4;
    }
    this.ctx.font = '700 25px "Atkinson Hyperlegible", "Segoe UI", sans-serif';
    return this.ctx.measureText(s).width + 0.6 * s.length;
  }

  private tick(now: number): void {
    const dt = Math.min(64, now - (this.last || now));
    this.last = now;
    const elapsed = this.started ? now - this.t0 : 0;
    this.elapsed.set(elapsed);
    const m = Math.min(TOTAL_MS, elapsed * (this.reduced ? 5 : SPEED));
    const loop = this.reduced ? 0 : (now / 6000) % 1;
    const state = this.state();
    const fr = frame(m, loop, this.g(), state === 'offline' ? 1 : 0, (s) => this.measure(s));
    this.f.set(fr);

    // The bar follows the animation, but waits at 90% until the server has answered.
    const connected = state === 'online' || state === 'preview';
    let bar = fr.barAnim;
    if (!connected) bar = Math.min(bar, 0.9);
    else if (m >= TOTAL_MS) bar = Math.min(1, Math.max(bar, this.bar() + dt / 450));
    else bar = Math.max(bar, this.bar());
    this.bar.set(bar);
    this.rocketTop.set(2 + Math.sin(loop * Math.PI * 2 * 4) * 2);

    // Make room for the "no connection" card: lift the logo scene just enough (but keep the disc on screen).
    const card = this.card()?.nativeElement;
    const g = this.g();
    const need = card ? g.wordTop + g.wordH + 18 - (card.offsetTop) : 0;
    this.lift.set(Math.round(Math.max(0, Math.min(need, g.cy - 100))));

    if (!this.finished && connected && m >= TOTAL_MS && bar >= 1) this.finish();

    if (this.finished) {
      // Leave with a circle, like the phone: the intro closes into the logo and the page shows around it.
      const p = Math.min(1, (now - this.exitAt) / (this.reduced ? 250 : EXIT_MS));
      const g = this.g();
      const r = Math.hypot(Math.max(g.cx, g.w - g.cx), Math.max(g.cy, g.h - g.cy)) * (1 - easeInCubic(p));
      this.clip.set(`circle(${r}px at ${g.cx}px ${g.cy}px)`);
      if (p >= 1) {
        this.done.emit();
        return;
      }
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }
}
