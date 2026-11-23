import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { apiMode } from '../core/api';
import { ProcessDone, ProcessOptions, ProcessResult, ProcessStep, Processing, ProcessingHost, describeError, doneOf, textOf } from '../core/processing';

type StepState = 'wait' | 'active' | 'done' | 'failed';
interface Source {
  rect: DOMRect;
  bg: string;
  color: string;
  radius: string;
  label: string;
}
interface Toast {
  id: number;
  title: string;
  detail?: string;
}

const EXPO_OUT = 'cubic-bezier(.16, 1, .3, 1)';
const IN_OUT = 'cubic-bezier(.65, 0, .35, 1)';
const PANEL_SHADOW = '0 40px 90px -30px rgba(14, 63, 54, .55), 0 2px 6px rgba(14, 63, 54, .08)';
const OPEN_MS = 560;
const ENTER_AT = 200;
const CLOSE_MS = 520;
const CELEBRATE_MS = 650;
/** Each step stays long enough to be read; the first one also covers the opening. */
const MIN_STEP_MS = 460;
const MIN_FIRST_STEP_MS = 760;
const MIN_ONE_MS = 1000;
const QUICK_MS = 400;
const SLOW_MS = 10000;
/** The message sits in the top-right corner of the page, 16 px from the edges. */
const TOAST_EDGE = 16;
const TOAST_H = 64;
/** How long the message stays (paused while the pointer or keyboard focus is on it). */
const TOAST_MS = 4500;
const CIRC = 2 * Math.PI * 50;

/** 18 thin rays, like the intro's sunburst, centred in a 100 × 100 box. */
const RAYS = (() => {
  let d = '';
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18;
    const h = (Math.PI / 18) * 0.5;
    const p = (g: number) => `${(50 + Math.cos(g) * 50).toFixed(2)},${(50 + Math.sin(g) * 50).toFixed(2)}`;
    d += `M50,50L${p(a - h)}L${p(a + h)}Z`;
  }
  return d;
})();

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const waitUntil = (t: number) => wait(Math.max(0, t - performance.now()));

/** What the loader grows out of: the pressed button's place, colour, corners and words. */
function readSource(el: Element): Source | null {
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight) return null;
  const s = getComputedStyle(el);
  const clear = s.backgroundColor === 'transparent' || /rgba\(.*,\s*0\)$/.test(s.backgroundColor);
  return {
    rect,
    bg: clear ? '#ffffff' : s.backgroundColor,
    color: s.color,
    radius: s.borderRadius || '10px',
    label: (el.textContent ?? '').trim().replace(/\s+/g, ' '),
  };
}

/**
 * The processing loader. The pressed button grows into a centred panel: the Pocket Lessons logo in a ring that
 * fills as the work goes on, what is happening (step by step for longer actions), and a note to keep the page
 * open. When it is done it confirms, then shrinks into a short message at the top while the page comes back.
 * The page behind is dimmed, blurred and cannot be used meanwhile (a modal dialog).
 */
@Component({
  selector: 'pl-processing',
  template: `
    <dialog #dlg class="dlg" aria-labelledby="proc-title" [attr.aria-describedby]="detail() ? 'proc-sub' : null" [attr.aria-busy]="phase() === 'working'" (cancel)="onCancel($event)">
      <div class="scrim" #scrim></div>
      <section
        #panel
        class="panel"
        [class.compact]="!steps().length"
        [class.in]="entered()"
        [class.ok]="phase() === 'done'"
        [class.err]="phase() === 'error'"
        [style.--pt]="pace()"
      >
        @if (source(); as s) { <span class="from" #fromEl [style.color]="s.color" aria-hidden="true">{{ s.label }}</span> }

        <div class="content" #content>
          <span class="chip" [attr.data-tone]="chip().tone"><i></i>{{ chip().text }}</span>

          <div class="mark" aria-hidden="true">
            <svg class="rays" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="proc-rays" cx=".5" cy=".5" r=".5">
                  <stop offset=".18" stop-color="#d6e7dd" />
                  <stop offset="1" stop-color="#d6e7dd" stop-opacity="0" />
                </radialGradient>
              </defs>
              <path [attr.d]="rays" fill="url(#proc-rays)" />
            </svg>
            <span class="pulse"></span>
            <svg class="ring" viewBox="0 0 112 112">
              <defs>
                <linearGradient id="proc-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#2f8f7c" />
                  <stop offset="1" stop-color="#0f4d43" />
                </linearGradient>
              </defs>
              <circle class="disc" cx="56" cy="56" r="50" />
              <circle class="track" cx="56" cy="56" r="50" />
              <circle class="prog" cx="56" cy="56" r="50" [attr.stroke-dasharray]="circ" [attr.stroke-dashoffset]="circ * (1 - progress())" />
              <g class="head" [style.transform]="'rotate(' + progress() * 360 + 'deg)'">
                <circle class="glow" cx="56" cy="6" r="11" />
                <circle class="dot" cx="56" cy="6" r="5" />
              </g>
            </svg>
            <img class="logo" src="brand/logo-icon.svg" alt="" width="62" height="70" />
            <span class="badge ok-badge">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
            <span class="badge bad-badge">!</span>
          </div>

          <div class="titles">
            @for (k of [titleKey()]; track k) {
              <h2 id="proc-title">@for (w of titleWords(); track $index) {<span class="w" [style.--i]="$index">{{ w }}</span>{{ ' ' }}}@if (phase() === 'working') {<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>}</h2>
            }
          </div>
          @if (detail()) { <p class="sub" id="proc-sub">{{ detail() }}</p> }

          @if (steps().length) {
            <div class="steps-box" [style.--n]="steps().length">
              <span class="hl" aria-hidden="true" [class.on]="activeIndex() >= 0" [style.transform]="'translateY(' + activeIndex() * 40 + 'px)'"></span>
              <ol class="steps">
                @for (s of steps(); track $index; let i = $index) {
                  <li class="step" [attr.data-state]="states()[i]" [style.--i]="i">
                    <svg class="ic" viewBox="0 0 22 22" aria-hidden="true">
                      <circle class="wait" cx="11" cy="11" r="9" />
                      <path class="spin" d="M11 2a9 9 0 0 1 9 9" />
                      <circle class="fill" cx="11" cy="11" r="11" />
                      <path class="check" d="M6.5 11.4l3 3 6-6.2" pathLength="1" />
                      <path class="bang" d="M11 6.4v6M11 15.6v.2" />
                    </svg>
                    <span class="tx"><b>{{ s }}</b><small>{{ details()[i] }}</small></span>
                  </li>
                }
              </ol>
            </div>
          }

          @if (phase() === 'error') {
            <p class="error-text problem" role="alert">{{ errorText() }}</p>
            <div class="actions">
              <button type="button" class="btn btn-ghost" (click)="answer(false)">Close</button>
              <button #retryBtn type="button" class="btn btn-primary" (click)="answer(true)">Try again</button>
            </div>
          } @else if (phase() === 'done') {
            <p class="foot"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>All done</p>
          } @else if (slow()) {
            <p class="foot slow">Still working. Your internet may be slow. Please keep this page open.</p>
          } @else {
            <p class="foot">
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
              This usually takes a few seconds. Please keep this page open.
            </p>
          }
          <p class="sr-only" aria-live="polite">{{ announce() }}</p>
        </div>
      </section>
    </dialog>

    <!-- The short message the loader becomes, in the top-right corner (it stays a few seconds; hovering keeps it). -->
    @for (m of toasts(); track m.id) {
      <div
        class="toast"
        role="status"
        [class.out]="toastOut()"
        [class.hold]="held()"
        (mouseenter)="hold(true)"
        (mouseleave)="hold(false)"
        (focusin)="hold(true)"
        (focusout)="hold(false)"
      >
        <span class="t-ok" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <span class="t-tx"><b>{{ m.title }}</b>@if (m.detail) {<span>{{ m.detail }}</span>}</span>
        <button type="button" class="t-x" aria-label="Dismiss" (click)="dismiss()">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>
        <span class="t-timer" aria-hidden="true"><i></i></span>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .dlg { border: 0; padding: 0; margin: 0; background: transparent; width: 100vw; height: 100vh; max-width: none; max-height: none; overflow: hidden; color: var(--ink); }
    .dlg::backdrop { background: transparent; }
    .dlg:not([open]) { display: none; }
    .scrim { position: fixed; inset: 0; background: rgba(14, 42, 37, .34); -webkit-backdrop-filter: blur(6px) saturate(.85); backdrop-filter: blur(6px) saturate(.85); }

    .panel {
      position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(448px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: hidden;
      background: #fff; border: 1px solid #e3e7e2; border-radius: 24px; box-shadow: 0 40px 90px -30px rgba(14, 63, 54, .55), 0 2px 6px rgba(14, 63, 54, .08);
    }
    .panel.compact { width: min(400px, calc(100vw - 32px)); }
    .from { position: absolute; inset: 0; display: grid; place-items: center; padding: 0 12px; font: 700 15px var(--font); white-space: nowrap; overflow: hidden; pointer-events: none; opacity: 0; }
    .content { position: relative; display: flex; flex-direction: column; align-items: center; padding: 30px 32px 24px; }
    .panel:not(.in) .content { opacity: 0; }

    .chip {
      position: absolute; top: 16px; right: 16px; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px 0 8px;
      border-radius: 99px; background: #f9faf8; border: 1px solid #e3e7e2; font: 700 12px var(--font); color: #5d6964;
    }
    .chip i { width: 8px; height: 8px; border-radius: 50%; background: #2fa36b; }
    .chip[data-tone='on'] i { animation: ping 1.8s ease-in-out infinite; }
    .chip[data-tone='local'] i { background: #7e8a84; }
    .chip[data-tone='slow'] i { background: #e0a21b; }
    .chip[data-tone='bad'] i { background: #b4412f; }

    .mark { position: relative; width: 112px; height: 112px; flex: none; }
    .mark > * { position: absolute; }
    .rays { left: -54px; top: -54px; width: 220px; height: 220px; opacity: .9; }
    .in .rays { animation: fade-in .7s .1s ease-out both, spin 40s linear infinite; }
    .ring { left: 0; top: 0; width: 112px; height: 112px; overflow: visible; }
    .disc { fill: #fff; }
    .track { fill: none; stroke: #e3eee8; stroke-width: 5; stroke-dasharray: 314.16; stroke-dashoffset: 0; transform: rotate(-90deg); transform-origin: 56px 56px; }
    .in .track { animation: draw .6s .05s cubic-bezier(.33, 1, .68, 1) both; }
    .prog { fill: none; stroke: url(#proc-ring); stroke-width: 5; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 56px 56px; transition: stroke-dashoffset var(--pt, .5s) cubic-bezier(.33, 1, .68, 1), stroke .3s; }
    .head { transform-origin: 56px 56px; transition: transform var(--pt, .5s) cubic-bezier(.33, 1, .68, 1), opacity .25s; }
    .head .glow { fill: rgba(242, 176, 30, .28); }
    .head .dot { fill: #f2b01e; stroke: #fff; stroke-width: 2; }
    .ok .head, .err .head { opacity: 0; }
    .err .prog { stroke: #b4412f; }
    .logo { left: 25px; top: 25px; width: 62px; height: auto; filter: drop-shadow(0 6px 10px rgba(14, 63, 54, .18)); }
    .in .logo { animation: logo-in .5s .08s cubic-bezier(.34, 1.56, .64, 1) both; }
    .badge {
      left: 76px; top: 74px; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #fff; display: grid; place-items: center;
      color: #fff; font: 800 15px var(--font); box-shadow: 0 4px 10px rgba(14, 63, 54, .3); transform: scale(0);
    }
    .ok-badge { background: #146b60; }
    .bad-badge { background: #b4412f; }
    .ok .ok-badge, .err .bad-badge { transform: none; animation: pop .45s cubic-bezier(.34, 1.56, .64, 1) both; }
    .pulse { left: 0; top: 0; width: 112px; height: 112px; border-radius: 50%; border: 2px solid #146b60; opacity: 0; }
    .ok .pulse { animation: pulse .7s ease-out both; }

    .titles { width: 100%; margin-top: 14px; text-align: center; }
    h2 { margin: 0; font: 700 25px/1.25 var(--serif); color: var(--title, #0e3f36); letter-spacing: -.01em; text-wrap: balance; }
    .w { display: inline-block; }
    .in .w { animation: word-in .52s cubic-bezier(.16, 1, .3, 1) both; animation-delay: calc(.12s + var(--i) * .05s); }
    .dots i { display: inline-block; width: 5px; height: 5px; margin-left: 4px; border-radius: 50%; background: currentColor; vertical-align: 4px; animation: dot 1.2s ease-in-out infinite; }
    .dots i:nth-child(2) { animation-delay: .15s; }
    .dots i:nth-child(3) { animation-delay: .3s; }
    .sub { margin-top: 4px; max-width: 100%; font-size: 14.5px; line-height: 1.45; color: #5d6964; text-align: center; overflow-wrap: anywhere; }
    .in .sub { animation: rise .45s .28s cubic-bezier(.16, 1, .3, 1) both; }

    .steps-box {
      position: relative; width: 100%; margin-top: 18px; padding: 8px 0; border-radius: 16px; background: #f9faf8; border: 1px solid #e3e7e2;
      min-height: calc(var(--n) * 40px + 34px);
    }
    .in .steps-box { animation: rise .45s .34s cubic-bezier(.16, 1, .3, 1) both; }
    .hl {
      position: absolute; left: 6px; right: 6px; top: 6px; height: 60px; border-radius: 12px; background: #fff; opacity: 0;
      box-shadow: 0 1px 2px rgba(14, 63, 54, .08), 0 6px 16px -10px rgba(14, 63, 54, .35);
      transition: transform .38s cubic-bezier(.16, 1, .3, 1), opacity .2s;
    }
    .hl.on { opacity: 1; }
    .steps { position: relative; list-style: none; margin: 0; padding: 0; }
    .step { display: flex; gap: 12px; padding: 9px 16px 9px 18px; }
    .in .step { animation: rise .42s cubic-bezier(.16, 1, .3, 1) both; animation-delay: calc(.4s + var(--i) * .07s); }
    .ic { flex: none; width: 22px; height: 22px; overflow: visible; }
    .ic .wait { fill: none; stroke: #c9d1cb; stroke-width: 2; transition: opacity .2s; }
    .ic .spin { fill: none; stroke: #146b60; stroke-width: 2.4; stroke-linecap: round; opacity: 0; transform-origin: 11px 11px; }
    .ic .fill { fill: #146b60; transform-origin: 11px 11px; transform: scale(0); }
    .ic .check { fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
    .ic .bang { fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; opacity: 0; }
    .step[data-state='active'] .spin { opacity: 1; animation: spin .9s linear infinite; }
    .step[data-state='done'] .wait, .step[data-state='failed'] .wait { opacity: 0; }
    .step[data-state='done'] .fill { transform: none; animation: pop .32s cubic-bezier(.34, 1.56, .64, 1) both; }
    .step[data-state='done'] .check { stroke-dashoffset: 0; animation: check .3s .1s ease-out both; }
    .step[data-state='failed'] .fill { fill: #b4412f; transform: none; }
    .step[data-state='failed'] .bang { opacity: 1; }
    .tx { min-width: 0; display: grid; }
    .tx b { font-size: 14.5px; line-height: 22px; color: #7d8883; transition: color .2s; }
    .step[data-state='active'] b { color: #141b18; }
    .step[data-state='done'] b { color: #2c3833; }
    .step[data-state='failed'] b { color: #8f3326; }
    .tx small {
      height: 0; overflow: hidden; font-size: 12.5px; line-height: 18px; color: #5d6964; opacity: 0; white-space: nowrap; text-overflow: ellipsis;
      transition: height .3s cubic-bezier(.16, 1, .3, 1), opacity .2s;
    }
    .step[data-state='active'] small, .step[data-state='failed'] small { height: 18px; opacity: 1; }

    .foot { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 16px; font-size: 13px; line-height: 1.4; color: #5d6964; text-align: center; }
    .foot.slow { color: #7a5600; }
    .in .foot { animation: rise .45s .55s cubic-bezier(.16, 1, .3, 1) both; }
    .problem { margin-top: 16px; text-align: center; }
    .actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }

    .toast {
      position: fixed; z-index: 1000; top: 16px; right: 16px;
      width: min(400px, calc(100vw - 32px)); min-height: 64px; display: flex; align-items: center; gap: 12px; padding: 12px 10px 14px 14px;
      background: #fff; border: 1px solid #e3e7e2; border-radius: 16px; box-shadow: 0 18px 40px -18px rgba(14, 63, 54, .45), 0 2px 6px rgba(14, 63, 54, .08);
    }
    .toast > * { animation: fade-in .25s ease-out both; }
    .toast.out { animation: toast-out .28s ease-in forwards; }
    .t-ok { flex: none; width: 36px; height: 36px; border-radius: 50%; background: #146b60; display: grid; place-items: center; animation: pop .4s .05s cubic-bezier(.34, 1.56, .64, 1) both; }
    .t-tx { flex: 1; min-width: 0; display: grid; }
    .t-tx b { font-size: 15px; line-height: 20px; color: #141b18; }
    .t-tx span { font-size: 12.5px; line-height: 18px; color: #5d6964; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .t-x { flex: none; width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: #5d6964; cursor: pointer; display: grid; place-items: center; }
    .t-x:hover { background: #f1f4f1; color: #141b18; }
    .t-x:focus-visible { outline: 3px solid #146b60; outline-offset: 1px; }
    .t-timer { position: absolute; left: 14px; right: 14px; bottom: 0; height: 3px; border-radius: 3px; background: #edf5f0; overflow: hidden; }
    .t-timer i { display: block; height: 100%; background: #146b60; transform-origin: left; animation: timer 4.5s linear forwards; }
    .toast.hold .t-timer i { animation-play-state: paused; }

    @keyframes fade-in { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } }
    @keyframes word-in { from { opacity: 0; transform: translateY(.6em); filter: blur(6px); } }
    @keyframes logo-in { from { opacity: 0; transform: scale(.55); } }
    @keyframes draw { from { stroke-dashoffset: 314.16; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pop { from { transform: scale(0); } }
    @keyframes check { from { stroke-dashoffset: 1; } }
    @keyframes pulse { from { opacity: .5; transform: scale(1); } to { opacity: 0; transform: scale(1.55); } }
    @keyframes dot { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
    @keyframes ping { 0%, 100% { box-shadow: 0 0 0 2px rgba(47, 163, 107, .18); } 50% { box-shadow: 0 0 0 5px rgba(47, 163, 107, .12); } }
    @keyframes timer { to { transform: scaleX(0); } }
    @keyframes toast-out { to { opacity: 0; transform: translateX(24px) scale(.98); } }

    @media (prefers-reduced-motion: reduce) {
      .in .rays, .in .track, .in .logo, .in .w, .in .sub, .in .steps-box, .in .step, .in .foot,
      .ok .ok-badge, .err .bad-badge, .ok .pulse, .step[data-state='active'] .spin, .step[data-state='done'] .fill,
      .step[data-state='done'] .check, .dots i, .chip i, .toast > *, .t-ok { animation: none; }
      .prog, .head, .hl, .tx small { transition: none; }
      /* The countdown bar would jump straight to empty; the message still closes on its own timer. */
      .t-timer { display: none; }
    }
  `,
})
export class ProcessingOverlay implements ProcessingHost {
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  private readonly scrim = viewChild.required<ElementRef<HTMLElement>>('scrim');
  private readonly fromEl = viewChild<ElementRef<HTMLElement>>('fromEl');
  private readonly retryBtn = viewChild<ElementRef<HTMLButtonElement>>('retryBtn');

  readonly circ = CIRC;
  readonly rays = RAYS;
  private readonly reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly title = signal('');
  readonly titleKey = signal(0);
  readonly titleWords = computed(() => this.title().split(/\s+/).filter(Boolean));
  readonly detail = signal('');
  readonly steps = signal<string[]>([]);
  readonly details = signal<string[]>([]);
  readonly states = signal<StepState[]>([]);
  readonly activeIndex = computed(() => this.states().indexOf('active'));
  readonly progress = signal(0);
  /** How fast the ring moves to its next value (slow and steady for one-step actions). */
  readonly pace = signal('.5s');
  readonly phase = signal<'working' | 'done' | 'error'>('working');
  readonly entered = signal(false);
  readonly slow = signal(false);
  readonly errorText = signal('');
  readonly announce = signal('');
  readonly source = signal<Source | null>(null);
  readonly toasts = signal<Toast[]>([]);
  readonly toastOut = signal(false);
  /** True while the pointer or keyboard focus is on the message: it stays until they leave. */
  readonly held = signal(false);
  readonly chip = computed(() => {
    if (this.phase() === 'error') return { tone: 'bad', text: 'Not finished' };
    if (this.phase() === 'done') return { tone: 'on', text: 'Done' };
    if (this.slow()) return { tone: 'slow', text: 'Slow connection' };
    return apiMode ? { tone: 'on', text: 'Connected' } : { tone: 'local', text: 'This browser' };
  });

  private answerFn: ((retry: boolean) => void) | null = null;
  private slowTimer?: ReturnType<typeof setTimeout>;
  private toastSeq = 0;
  // A real timer decides when the message closes (the bar is only a picture of it, and is skipped
  // when the device asks for less motion).
  private toastTimer?: ReturnType<typeof setTimeout>;
  private toastLeft = TOAST_MS;
  private toastFrom = 0;

  constructor() {
    const detach = inject(Processing).attach(this);
    inject(DestroyRef).onDestroy(() => {
      detach();
      clearTimeout(this.slowTimer);
      clearTimeout(this.toastTimer);
    });
  }

  async run(o: ProcessOptions, from: Element | null): Promise<ProcessResult> {
    const listed = o.steps ?? [];
    const work: ProcessStep[] = [...listed];
    if (o.run || !work.length) work.push({ label: o.title, run: o.run });
    this.reset(o, listed);

    let opened: Promise<void> | null = null;
    const open = () => (opened ??= this.open(from));
    const timer = o.quick ? setTimeout(open, QUICK_MS) : undefined;
    if (!o.quick) open();

    let i = 0;
    for (;;) {
      try {
        for (; i < work.length; i++) {
          const started = performance.now();
          this.activate(i, work[i], i < listed.length);
          await work[i].run?.();
          // Quick saves never wait; the others stay long enough to read each step.
          if (opened && !o.quick) await waitUntil(started + (i < listed.length ? (i === 0 ? MIN_FIRST_STEP_MS : MIN_STEP_MS) : MIN_ONE_MS));
          this.complete(i, i < listed.length);
        }
        break;
      } catch (err) {
        const text = (o.errorText ?? describeError)(err);
        clearTimeout(timer);
        if (o.errors === 'inline') {
          if (opened) {
            await opened;
            await this.closeQuietly();
          }
          return { ok: false, error: text };
        }
        await open();
        if (!(await this.fail(i, text, i < listed.length))) {
          await this.closeQuietly();
          return { ok: false, error: text };
        }
      }
    }
    clearTimeout(timer);
    if (!opened) return { ok: true }; // a quick save that needed no loader
    await opened;
    const done = doneOf(o);
    this.pace.set('.35s');
    this.progress.set(1);
    if (done && !o.quick) await this.celebrate(done);
    if (done && !done.quiet) await this.closeIntoToast(done);
    else await this.closeQuietly();
    return { ok: true };
  }

  /** "Try again" (true) or "Close" (false) after a failure. */
  answer(retry: boolean): void {
    const fn = this.answerFn;
    this.answerFn = null;
    if (retry) {
      this.phase.set('working');
      this.startSlowTimer();
    }
    fn?.(retry);
  }

  /** Esc does nothing while working (the work can't be stopped halfway); after a failure it closes. */
  onCancel(e: Event): void {
    e.preventDefault();
    if (this.phase() === 'error') this.answer(false);
  }

  /** Keeps the message while it is pointed at or focused; the countdown carries on afterwards. */
  hold(on: boolean): void {
    if (!this.toasts().length || this.toastOut() || on === this.held()) return;
    this.held.set(on);
    if (on) {
      clearTimeout(this.toastTimer);
      this.toastLeft = Math.max(800, this.toastLeft - (performance.now() - this.toastFrom));
    } else {
      this.countDown();
    }
  }

  private countDown(): void {
    clearTimeout(this.toastTimer);
    this.toastFrom = performance.now();
    this.toastTimer = setTimeout(() => this.dismiss(), this.toastLeft);
  }

  dismiss(): void {
    clearTimeout(this.toastTimer);
    if (!this.toasts().length || this.toastOut()) return;
    this.toastOut.set(true);
    setTimeout(() => {
      this.toasts.set([]);
      this.toastOut.set(false);
    }, 280);
  }

  // ---------- steps ----------

  private reset(o: ProcessOptions, steps: ProcessStep[]): void {
    this.phase.set('working');
    this.entered.set(false);
    this.slow.set(false);
    this.errorText.set('');
    this.setTitle(o.title);
    this.detail.set(o.detail ?? '');
    this.steps.set(steps.map((s) => s.label));
    this.details.set(steps.map(() => ''));
    this.states.set(steps.map(() => 'wait'));
    this.pace.set('.5s');
    this.progress.set(0);
    this.announce.set(o.title);
  }

  private activate(i: number, step: ProcessStep, listed: boolean): void {
    if (!listed) {
      // One-step actions: the ring moves on steadily while the work runs.
      this.pace.set('2.6s');
      this.progress.set(0.82);
      return;
    }
    this.states.update((s) => s.map((x, j) => (j === i ? 'active' : x)));
    this.details.update((d) => d.map((x, j) => (j === i ? textOf(step.detail) : x)));
    this.progress.set((i + 0.5) / this.steps().length);
    this.announce.set(step.label);
  }

  private complete(i: number, listed: boolean): void {
    if (!listed) return;
    this.states.update((s) => s.map((x, j) => (j === i ? 'done' : x)));
    this.progress.set((i + 1) / this.steps().length);
  }

  private fail(i: number, text: string, listed: boolean): Promise<boolean> {
    clearTimeout(this.slowTimer);
    this.slow.set(false);
    this.phase.set('error');
    if (listed) this.states.update((s) => s.map((x, j) => (j === i ? 'failed' : x)));
    this.errorText.set(text);
    this.announce.set('');
    setTimeout(() => this.retryBtn()?.nativeElement.focus(), 60);
    return new Promise((resolve) => (this.answerFn = resolve));
  }

  private async celebrate(done: ProcessDone): Promise<void> {
    clearTimeout(this.slowTimer);
    this.slow.set(false);
    this.phase.set('done');
    this.setTitle(done.title);
    if (done.detail) this.detail.set(done.detail);
    this.announce.set(done.title);
    await wait(this.reduced ? 300 : CELEBRATE_MS);
  }

  private setTitle(t: string): void {
    this.title.set(t);
    this.titleKey.update((k) => k + 1);
  }

  private startSlowTimer(): void {
    clearTimeout(this.slowTimer);
    this.slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);
  }

  // ---------- opening and closing ----------

  /** The pressed button grows into the panel (or, without one, the panel rises in), the page dims and blurs. */
  private async open(from: Element | null): Promise<void> {
    const src = from ? readSource(from) : null;
    this.source.set(src);
    clearTimeout(this.toastTimer);
    this.toasts.set([]);
    const dlg = this.dlg().nativeElement;
    if (!dlg.open) dlg.showModal();
    await nextFrame();
    this.startSlowTimer();
    const panel = this.panel().nativeElement;
    const end = panel.getBoundingClientRect();
    this.scrim().nativeElement.animate([{ opacity: 0 }, { opacity: 1 }], { duration: this.reduced ? 150 : 460, easing: 'ease-out' });
    if (this.reduced || !src) {
      this.entered.set(true);
      const a = panel.animate(
        [{ opacity: 0, transform: 'translate(-50%, -47%) scale(.97)' }, { opacity: 1, transform: 'translate(-50%, -50%)' }],
        { duration: this.reduced ? 150 : 380, easing: EXPO_OUT },
      );
      await a.finished.catch(() => undefined);
      return;
    }
    const r = src.rect;
    const grow = panel.animate(
      [
        { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: src.radius, transform: 'none' },
        { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`, borderRadius: '24px', transform: 'none' },
      ],
      { duration: OPEN_MS, easing: EXPO_OUT },
    );
    // The button's colour turns to the panel's white while it grows, so it never looks muddy.
    panel.animate(
      [
        { backgroundColor: src.bg, boxShadow: 'none', borderColor: 'transparent' },
        { backgroundColor: '#ffffff', boxShadow: PANEL_SHADOW, borderColor: '#e3e7e2' },
      ],
      { duration: 300, easing: 'ease-out' },
    );
    this.fromEl()?.nativeElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out' });
    setTimeout(() => this.entered.set(true), ENTER_AT);
    await grow.finished.catch(() => undefined);
  }

  /** The panel shrinks into the message in the top-right corner while the page comes back into focus. */
  private async closeIntoToast(done: ProcessDone): Promise<void> {
    const panel = this.panel().nativeElement;
    const start = panel.getBoundingClientRect();
    // The page's own width (without a scroll bar), so the panel lands exactly where the message sits.
    const pageW = document.documentElement.clientWidth || innerWidth;
    const w = Math.min(400, pageW - 2 * TOAST_EDGE);
    const dur = this.reduced ? 160 : CLOSE_MS;
    this.content().nativeElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: Math.min(160, dur), fill: 'forwards' });
    this.scrim().nativeElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, delay: this.reduced ? 0 : 80, easing: 'ease-in-out', fill: 'forwards' });
    const shrink = this.reduced
      ? panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, fill: 'forwards' })
      : panel.animate(
          [
            { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, borderRadius: '24px', transform: 'none' },
            { left: `${pageW - TOAST_EDGE - w}px`, top: `${TOAST_EDGE}px`, width: `${w}px`, height: `${TOAST_H}px`, borderRadius: '16px', transform: 'none' },
          ],
          { duration: dur, easing: IN_OUT, fill: 'forwards' },
        );
    await shrink.finished.catch(() => undefined);
    this.toastOut.set(false);
    this.held.set(false);
    this.toasts.set([{ id: ++this.toastSeq, title: done.title, detail: done.detail }]);
    this.toastLeft = TOAST_MS;
    this.countDown();
    await nextFrame();
    this.finish();
  }

  private async closeQuietly(): Promise<void> {
    const dur = this.reduced ? 150 : 240;
    this.scrim().nativeElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur + 60, easing: 'ease-out', fill: 'forwards' });
    const out = this.panel().nativeElement.animate(
      [{ opacity: 1, transform: 'translate(-50%, -50%)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(.96)' }],
      { duration: dur, easing: 'ease-in', fill: 'forwards' },
    );
    await out.finished.catch(() => undefined);
    this.finish();
  }

  private finish(): void {
    clearTimeout(this.slowTimer);
    const dlg = this.dlg().nativeElement;
    if (dlg.open) dlg.close();
    for (const el of [this.panel(), this.content(), this.scrim()]) el.nativeElement.getAnimations().forEach((a) => a.cancel());
    this.entered.set(false);
    this.source.set(null);
  }
}
