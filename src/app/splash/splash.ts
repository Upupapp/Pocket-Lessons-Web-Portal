import { Component, DestroyRef, HostListener, inject, output, signal } from '@angular/core';

const DURATION_MS = 4600;
const STEPS = [
  { at: 0, text: 'Preparing your classroom…' },
  { at: 0.3, text: 'Loading your lessons…' },
  { at: 0.58, text: 'Checking for new reading recordings…' },
  { at: 0.86, text: 'Ready' },
];

/**
 * Intro shown once per session before the welcome pages.
 * Story: the teacher's voice lesson travels to the family phone by hotspot, phone to phone, or online.
 */
@Component({
  selector: 'pl-splash',
  template: `
    <div class="splash" [class.leaving]="leaving()" role="dialog" aria-label="Pocket Lessons is loading">
      <div class="glow" aria-hidden="true"></div>

      <button type="button" class="skip" (click)="finish()">Skip intro</button>

      <svg class="scene" viewBox="0 0 760 280" aria-hidden="true">
        <defs>
          <radialGradient id="pk" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFE8A3" />
            <stop offset="55%" stop-color="#F6CC59" />
            <stop offset="100%" stop-color="#F6CC59" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1B7A6D" />
            <stop offset="100%" stop-color="#0F544B" />
          </linearGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <!-- Routes: hotspot (top), phone to phone (middle), online (bottom) -->
        <g fill="none" stroke="#5FC7B5" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 9">
          <path id="r1" class="route" d="M196 140 C 320 40, 450 40, 574 140" />
          <path id="r2" class="route d2" d="M196 140 L 574 140" />
          <path id="r3" class="route d3" d="M196 140 C 320 240, 450 240, 574 140" />
        </g>

        <g class="labels" font-family="Atkinson Hyperlegible, system-ui, sans-serif" font-size="13" font-weight="700">
          <g class="tag t1" transform="translate(385 66)">
            <rect x="-44" y="-14" width="88" height="28" rx="14" />
            <text text-anchor="middle" dy="4.5">Hotspot</text>
          </g>
          <g class="tag t2" transform="translate(385 140)">
            <rect x="-62" y="-14" width="124" height="28" rx="14" />
            <text text-anchor="middle" dy="4.5">Phone to phone</text>
          </g>
          <g class="tag t3" transform="translate(385 214)">
            <rect x="-40" y="-14" width="80" height="28" rx="14" />
            <text text-anchor="middle" dy="4.5">Online</text>
          </g>
        </g>

        <!-- Lesson packs travelling to the phone -->
        <g class="packets">
          <g><circle r="15" fill="url(#pk)" /><circle r="5" fill="#FFF3C4" />
            <animateMotion dur="1.7s" begin="0.9s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.3 1"><mpath href="#r1" /></animateMotion></g>
          <g><circle r="15" fill="url(#pk)" /><circle r="5" fill="#FFF3C4" />
            <animateMotion dur="1.5s" begin="1.25s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.3 1"><mpath href="#r2" /></animateMotion></g>
          <g><circle r="15" fill="url(#pk)" /><circle r="5" fill="#FFF3C4" />
            <animateMotion dur="1.9s" begin="1.55s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.3 1"><mpath href="#r3" /></animateMotion></g>
        </g>

        <!-- Teacher's voice lesson -->
        <g transform="translate(130 140)"><g class="lesson">
          <rect x="-74" y="-74" width="148" height="148" rx="30" fill="#0F4A44" />
          <rect x="-44" y="-56" width="88" height="112" rx="14" fill="#FFF9ED" />
          <rect x="18" y="-56" width="26" height="18" rx="6" fill="#F6CC59" />
          <rect x="-30" y="-30" width="34" height="7" rx="3.5" fill="#146B60" />
          <rect x="-30" y="-14" width="52" height="7" rx="3.5" fill="#146B60" opacity=".55" />
          <!-- voice waveform -->
          <g class="wave" fill="#146B60">
            <rect x="-30" y="10" width="6" height="24" rx="3" />
            <rect x="-20" y="10" width="6" height="24" rx="3" />
            <rect x="-10" y="10" width="6" height="24" rx="3" />
            <rect x="0" y="10" width="6" height="24" rx="3" />
            <rect x="10" y="10" width="6" height="24" rx="3" />
            <rect x="20" y="10" width="6" height="24" rx="3" />
          </g>
          <!-- microphone badge -->
          <g transform="translate(44 50)">
            <circle r="20" fill="#F6CC59" />
            <rect x="-5.5" y="-11" width="11" height="16" rx="5.5" fill="#163C3B" />
            <path d="M-9 1 a9 9 0 0 0 18 0 M0 10 v5" stroke="#163C3B" stroke-width="2.6" fill="none" stroke-linecap="round" />
          </g>
        </g></g>

        <!-- Family phone -->
        <g transform="translate(630 140)"><g class="phone">
          <rect x="-50" y="-88" width="100" height="176" rx="22" fill="#0B2F2C" stroke="#F3E9D2" stroke-width="5" />
          <rect x="-40" y="-76" width="80" height="152" rx="14" fill="url(#screen)" />
          <rect x="-16" y="-82" width="32" height="6" rx="3" fill="#F3E9D2" opacity=".7" />
          <g class="received">
            <circle r="30" cy="6" fill="#FFF9ED" opacity=".14" />
            <rect x="-17" y="-16" width="34" height="44" rx="7" fill="#FFF9ED" />
            <rect x="5" y="-16" width="12" height="9" rx="3" fill="#F6CC59" />
            <rect x="-10" y="-4" width="14" height="4" rx="2" fill="#146B60" />
            <rect x="-10" y="5" width="20" height="4" rx="2" fill="#146B60" opacity=".55" />
            <rect x="-10" y="14" width="16" height="4" rx="2" fill="#146B60" opacity=".55" />
            <g transform="translate(20 30)"><g class="check">
              <circle r="11" fill="#F6CC59" />
              <path d="M-5 0 l3.5 3.5 l6.5 -7" stroke="#163C3B" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </g></g>
          </g>
        </g></g>
      </svg>

      <div class="brand">
        <h1>Pocket Lessons</h1>
        <p class="fil">Baong aral, kahit walang signal.</p>
        <p class="en">A teacher's voice that reaches every pocket, even without signal.</p>
      </div>

      <div class="progress" role="status" aria-live="polite">
        <div class="bar"><span [style.width.%]="progress() * 100"></span></div>
        <p>{{ status() }}</p>
      </div>

      <p class="credit">AHA Learning Center <span aria-hidden="true">×</span> UpUp Technologies</p>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 1000; }
    .splash {
      position: absolute; inset: 0; overflow: hidden;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 32px 20px 64px; gap: 8px; color: #FFF9ED; text-align: center;
      background: radial-gradient(120% 90% at 50% 0%, #0E4943 0%, #0B3B37 45%, #06231F 100%);
      transition: opacity .5s ease, transform .5s ease;
    }
    .splash.leaving { opacity: 0; transform: scale(1.02); pointer-events: none; }
    .glow {
      position: absolute; width: 70vmax; height: 70vmax; left: 50%; top: 38%;
      transform: translate(-50%, -50%); border-radius: 50%;
      background: radial-gradient(circle, rgba(95, 199, 181, .14), transparent 60%);
      animation: breathe 4s ease-in-out infinite;
    }
    .skip {
      position: absolute; top: 18px; right: 18px; z-index: 2;
      background: rgba(255, 249, 237, .08); color: #D2E6DF; border: 1px solid rgba(210, 230, 223, .25);
      border-radius: 999px; padding: 8px 16px; font: 700 13px/1 var(--font); cursor: pointer;
    }
    .skip:hover { background: rgba(255, 249, 237, .16); color: #FFF9ED; }

    .scene { width: min(760px, 92vw); height: auto; position: relative; overflow: visible; }
    .route { stroke-dashoffset: 400; animation: draw 1.1s ease-out .35s both, flow 1.2s linear 1.45s infinite; opacity: .9; }
    .route.d2 { animation-delay: .5s, 1.6s; }
    .route.d3 { animation-delay: .65s, 1.75s; }
    .tag rect { fill: #0B3B37; stroke: rgba(210, 230, 223, .45); stroke-width: 1.2; }
    .tag text { fill: #D2E6DF; }
    .tag { opacity: 0; animation: fade-in .5s ease-out both; }
    .t1 { animation-delay: .9s; } .t2 { animation-delay: 1.05s; } .t3 { animation-delay: 1.2s; }
    .packets g { opacity: 0; animation: fade-in .15s linear .9s both; }
    .packets g:nth-child(2) { animation-delay: 1.25s; } .packets g:nth-child(3) { animation-delay: 1.55s; }

    .lesson { animation: pop .6s cubic-bezier(.2, .9, .3, 1.3) .1s both; transform-box: fill-box; transform-origin: center; }
    .wave rect { transform-box: fill-box; transform-origin: center; animation: talk .9s ease-in-out infinite; }
    .wave rect:nth-child(2) { animation-delay: -.15s; } .wave rect:nth-child(3) { animation-delay: -.45s; }
    .wave rect:nth-child(4) { animation-delay: -.3s; } .wave rect:nth-child(5) { animation-delay: -.6s; }
    .wave rect:nth-child(6) { animation-delay: -.75s; }
    .phone { animation: pop .6s cubic-bezier(.2, .9, .3, 1.3) .25s both; transform-box: fill-box; transform-origin: center; }
    .received { opacity: 0; transform-box: fill-box; transform-origin: center; animation: arrive .55s cubic-bezier(.2, .9, .3, 1.4) 2.75s both; }
    .check { opacity: 0; transform-box: fill-box; transform-origin: center; animation: arrive .4s cubic-bezier(.2, .9, .3, 1.6) 3.35s both; }

    .brand { position: relative; margin-top: 4px; }
    h1 {
      font-family: var(--serif); font-weight: 700; letter-spacing: -.015em;
      font-size: clamp(40px, 6.4vw, 68px); line-height: 1.05; color: #FFF9ED;
      animation: rise .7s ease-out .45s both;
    }
    .fil { margin-top: 10px; font-size: clamp(17px, 2.1vw, 21px); font-weight: 700; color: #F6CC59; animation: rise .7s ease-out .65s both; }
    .en { margin-top: 4px; font-size: clamp(14px, 1.6vw, 16px); color: #B9D6CE; animation: rise .7s ease-out .8s both; }

    .progress { width: min(340px, 80vw); margin-top: 26px; position: relative; animation: rise .6s ease-out .9s both; }
    .bar { height: 6px; border-radius: 999px; background: rgba(210, 230, 223, .16); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #5FC7B5, #F6CC59); transition: width .25s linear; }
    .progress p { margin-top: 10px; font-size: 14px; color: #D2E6DF; min-height: 21px; }
    .credit { position: absolute; bottom: 22px; left: 0; right: 0; font-size: 13px; color: rgba(210, 230, 223, .7); letter-spacing: .02em; }

    @keyframes draw { from { stroke-dashoffset: 400; opacity: 0; } to { stroke-dashoffset: 0; opacity: .9; } }
    @keyframes flow { to { stroke-dashoffset: -40; } }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
    @keyframes arrive { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
    @keyframes talk { 0%, 100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @keyframes breathe { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }

    @media (max-width: 560px) { .tag text { font-size: 15px; } }
    @media (prefers-reduced-motion: reduce) {
      .packets { display: none; }
      .received, .check { opacity: 1; }
    }
  `,
})
export class Splash {
  readonly done = output<void>();
  readonly progress = signal(0);
  readonly status = signal(STEPS[0].text);
  readonly leaving = signal(false);

  private finished = false;
  private readonly start = performance.now();
  private readonly duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1600 : DURATION_MS;

  constructor() {
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - this.start) / this.duration);
      this.progress.set(p);
      const step = [...STEPS].reverse().find((s) => p >= s.at);
      if (step && step.text !== this.status()) this.status.set(step.text);
      if (p >= 1) this.finish();
    }, 60);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  @HostListener('document:keydown.escape')
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.progress.set(1);
    this.status.set('Ready');
    this.leaving.set(true);
    setTimeout(() => this.done.emit(), 500);
  }
}
