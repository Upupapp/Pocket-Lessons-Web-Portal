import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input } from '@angular/core';
import {
  LAPTOP_SCREENS,
  LaptopScreen,
  MOMENTS,
  OPENING,
  OPENING_LEAD,
  PHONE_SCREENS,
  PhoneScreen,
  devicePose,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  laptopScreen,
  lessonChip,
  noteAt,
  noteText,
  phoneScreen,
  screenWeights,
  span,
} from './welcome-devices-motion';
import { CardView, Lang, PAGES, SUNBURST_PATH, mix } from './welcome-motion';

const LAPTOP_SRC: Record<LaptopScreen, string> = {
  lessons: 'welcome/teacher-lessons.webp',
  upload: 'welcome/teacher-upload.webp',
  reading: 'welcome/teacher-reading.webp',
  creating: 'welcome/teacher-creating.webp',
  created: 'welcome/teacher-created.webp',
  admin: 'welcome/admin-overview.webp',
};
const PHONE_SRC: Record<PhoneScreen, string> = {
  path: 'welcome/child-path.webp',
  lesson: 'welcome/child-lesson.webp',
  done: 'welcome/child-done.webp',
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
type Pt = { x: number; y: number };
/** A point on a quadratic curve from a to b, bending towards c. */
const curve = (a: Pt, c: Pt, b: Pt, f: number): Pt => ({
  x: (1 - f) ** 2 * a.x + 2 * (1 - f) * f * c.x + f * f * b.x,
  y: (1 - f) ** 2 * a.y + 2 * (1 - f) * f * c.y + f * f * b.y,
});

/**
 * The welcome pages' pictures: a laptop with the real teacher and admin portal on its screen and the Android
 * phone with the child's lessons, in 3D (CSS transforms only, no 3D library). The page around it owns the
 * position between pages (`pos`); this draws the devices for that position and plays each page's moment:
 * a lesson travelling to the child's phone, a PDF turned into a lesson, a child's star lighting up the chart.
 * Decorative: hidden from screen readers, and it never takes the pointer (the stage handles dragging).
 */
@Component({
  selector: 'pl-welcome-devices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class.narrow]': '!wide()' },
  template: `
    <div class="glow"></div>
    <svg class="burst" viewBox="0 0 100 100"><path class="rays" [attr.d]="sunburst" fill="#fff" /></svg>
    <div class="cam">
      <div class="rig">
        <div class="p3 f floor"></div>
        <div class="p3 laptop">
          <div class="f base-top"><div class="spill"></div><div class="keys"></div><div class="pad"></div></div>
          <div class="f base-front"></div>
          <div class="f base-l"></div>
          <div class="f base-r"></div>
          <div class="p3 lid">
            <div class="f lid-front">
              <span class="cam-dot"></span>
              <div class="screen">
                @for (s of laptop; track s.k) {
                  <img class="shot" [attr.data-k]="s.k" [src]="s.src" alt="" decoding="async" draggable="false" />
                }
                <div class="drop-flash"></div>
                <div class="bar-glow"></div>
                <div class="wake"></div>
                <div class="glare lglare"></div>
                <span class="anchor" data-a="unit" style="left: 36%; top: 41%"></span>
                <span class="anchor" data-a="drop" style="left: 50%; top: 48%"></span>
                <span class="anchor" data-a="bar" style="left: 64.7%; top: 50.6%"></span>
                <span class="anchor" data-a="ltr" style="left: 96%; top: 6%"></span>
                <span class="anchor" data-a="ltl" style="left: 4%; top: 6%"></span>
              </div>
            </div>
            <div class="f lid-back"><img src="brand/logo-icon.svg" alt="" draggable="false" /></div>
            <div class="f lid-top"></div>
            <div class="f lid-l"></div>
            <div class="f lid-r"></div>
          </div>
        </div>
        <div class="p3 phone">
          @for (z of slabs; track z) {
            <div class="slab" [style.transform]="'translateZ(' + -z + 'px)'"></div>
          }
          <div class="f ph-front">
            <span class="key" style="top: 70px; height: 34px"></span>
            <span class="key" style="top: 116px; height: 22px"></span>
            <div class="ph-screen">
              @for (s of phone; track s.k) {
                <img class="shot" [attr.data-k]="s.k" [src]="s.src" alt="" decoding="async" draggable="false" />
              }
              <div class="status">
                <span>3:02</span>
                <span class="r">
                  <svg width="7" height="7" viewBox="0 0 24 24"><path fill="#3B2A1E" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
                  <svg width="11" height="6" viewBox="0 0 22 12"><rect x=".5" y=".5" width="18" height="11" rx="2.5" fill="none" stroke="#3B2A1E" /><rect x="2" y="2" width="12" height="8" rx="1.2" fill="#3B2A1E" /><rect x="19.5" y="4" width="2" height="4" rx="1" fill="#3B2A1E" /></svg>
                  <span>78%</span>
                </span>
              </div>
              <span class="punch"></span>
              <span class="gesture"></span>
              <div class="ring pulse"></div>
              <div class="ring pulse"></div>
              <div class="ring sound"></div>
              <div class="ring sound"></div>
              <div class="glare pglare"></div>
              <span class="anchor" data-a="node" style="left: 29.9%; top: 32.9%"></span>
              <span class="anchor" data-a="medal" style="left: 50%; top: 34%"></span>
              <span class="anchor" data-a="ptl" style="left: 2%; top: 4%"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="fx">
      <svg class="trail"><path /></svg>
      <div class="fly lesson">
        <div class="chip"><img src="subjects/hut.webp" alt="" /><div><b>{{ chip().title }}</b><span>{{ chip().detail }}</span></div></div>
      </div>
      <div class="fly pdf">
        <div class="sheet"><i class="t"></i><i></i><i></i><i style="width: 80%"></i><i></i><i style="width: 60%"></i><i></i><i style="width: 72%"></i><span class="tag">PDF</span></div>
        <span class="name">Ang Matalinong Pagong.pdf</span>
      </div>
      <div class="fly star"><img src="icons3d/star.webp" alt="" /></div>
      @for (n of notes(); track $index) {
        <div class="note" [attr.data-n]="$index">
          <span class="ic" [class.up]="$index === 2">
            @switch ($index) {
              @case (0) { <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg> }
              @case (1) { <svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg> }
              @default { <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg> }
            }
          </span>
          <div><strong>{{ n.title }}</strong><span class="d">{{ n.detail }}</span></div>
          <i class="line"></i>
        </div>
      }
    </div>
  `,
  styles: `
    :host { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .glow { position: absolute; border-radius: 50%; }
    /* The rays shine from behind the screens only: they fade out before they reach the floor. */
    .burst {
      position: absolute; opacity: .3;
      -webkit-mask-image: radial-gradient(closest-side at 50% 50%, #000 30%, transparent 100%), linear-gradient(180deg, #000 0%, #000 46%, transparent 62%);
      -webkit-mask-composite: source-in;
      mask-image: radial-gradient(closest-side at 50% 50%, #000 30%, transparent 100%), linear-gradient(180deg, #000 0%, #000 46%, transparent 62%);
      mask-composite: intersect;
    }

    .cam { position: absolute; inset: 0; perspective: 2300px; }
    .rig { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; will-change: transform; }
    .p3 { position: absolute; transform-style: preserve-3d; }
    .f { position: absolute; backface-visibility: hidden; }
    .floor { left: -520px; top: 0; width: 1040px; height: 720px; transform-origin: 50% 0; }

    /* Laptop: generic, silver deck, black glass bezel (no maker's notch or logo). */
    .base-top {
      left: -275px; top: 0; width: 550px; height: 360px; transform-origin: 50% 0; transform: rotateX(90deg); border-radius: 4px 4px 22px 22px;
      background: linear-gradient(180deg, #D9DDE1 0%, #E9ECEE 40%, #DDE1E4 100%); overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .55), inset 0 -2px 0 rgba(0, 0, 0, .06);
    }
    .spill { position: absolute; inset: 0; background: radial-gradient(70% 55% at 50% 0%, rgba(255, 255, 255, .55), transparent 70%); }
    .keys {
      position: absolute; left: 44px; top: 30px; width: 462px; height: 158px; border-radius: 9px; background-color: #23282C;
      background-image: repeating-linear-gradient(90deg, transparent 0 30px, #3A4046 30px 33px), repeating-linear-gradient(0deg, transparent 0 23px, #3A4046 23px 26.4px);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, .55), 0 1px 0 rgba(255, 255, 255, .7);
    }
    .keys::after { content: ''; position: absolute; left: 132px; right: 132px; bottom: 6px; height: 21px; border-radius: 3px; background: #23282C; box-shadow: 0 0 0 1px #3A4046; }
    .pad { position: absolute; left: 192px; top: 214px; width: 166px; height: 112px; border-radius: 11px; background: linear-gradient(180deg, #D3D7DB, #DCE0E3); box-shadow: inset 0 1px 2px rgba(0, 0, 0, .18), 0 1px 0 rgba(255, 255, 255, .8); }
    .base-front { left: -275px; top: 0; width: 550px; height: 13px; transform: translateZ(360px); border-radius: 0 0 14px 14px; background: linear-gradient(180deg, #C9CED2, #A9AFB5); }
    .base-front::after { content: ''; position: absolute; left: 50%; top: 0; width: 96px; height: 5px; margin-left: -48px; border-radius: 0 0 6px 6px; background: rgba(0, 0, 0, .14); }
    .base-l { left: -275px; top: 0; width: 360px; height: 13px; transform-origin: 0 0; transform: rotateY(-90deg); background: linear-gradient(90deg, #B5BBC0, #C7CCD0); }
    .base-r { left: 275px; top: 0; width: 360px; height: 13px; transform-origin: 0 0; transform: translateZ(360px) rotateY(90deg); background: linear-gradient(90deg, #C7CCD0, #ADB3B9); }
    .lid { left: -265px; top: -344px; width: 530px; height: 344px; transform-origin: 50% 100%; }
    .lid-front { inset: 0; border-radius: 16px 16px 5px 5px; background: #0E1416; box-shadow: inset 0 0 0 1.5px #2A3134; }
    .cam-dot { position: absolute; left: 50%; top: 6px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #1E2629; }
    .screen { position: absolute; left: 13px; top: 14px; width: 504px; height: 315px; border-radius: 4px; overflow: hidden; background: #0B1012; }
    .shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; user-select: none; }
    .wake { position: absolute; inset: 0; background: #0B1012; opacity: 0; }
    .glare { position: absolute; inset: 0; background-size: 260% 100%; }
    .lglare { background-image: linear-gradient(118deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, .13) 44%, rgba(255, 255, 255, 0) 58%); }
    .pglare { background-image: linear-gradient(125deg, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, .16) 48%, rgba(255, 255, 255, 0) 60%); background-size: 280% 100%; }
    .lid-back {
      inset: 0; transform: translateZ(-7px) rotateY(180deg); border-radius: 16px 16px 5px 5px; display: grid; place-items: center;
      background: linear-gradient(160deg, #E4E7EA, #CBD0D4 70%, #C2C7CC); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .6);
    }
    .lid-back img { width: 74px; height: 74px; filter: grayscale(1) brightness(1.25) contrast(.75); opacity: .55; }
    .lid-top { left: 0; top: 0; width: 530px; height: 7px; transform-origin: 50% 0; transform: translateZ(-7px) rotateX(90deg); border-radius: 4px; background: linear-gradient(90deg, #C2C7CC, #DDE1E4, #C2C7CC); }
    .lid-l { left: 0; top: 0; width: 7px; height: 344px; transform-origin: 0 0; transform: translateZ(-7px) rotateY(-90deg); background: #B9BFC4; }
    .lid-r { left: 530px; top: 0; width: 7px; height: 344px; transform-origin: 0 0; transform: rotateY(90deg); background: #AEB4BA; }

    /* Phone: the Android handset of the Subject Themes walkthrough (dark green body, punch-hole, side keys). */
    .phone { left: -82px; top: 0; width: 164px; height: 334px; transform-origin: 50% 100%; }
    .slab { position: absolute; inset: 0; border-radius: 26px; background: #0C2423; }
    .ph-front { inset: 0; border-radius: 26px; background: #163C3B; box-shadow: inset 0 0 0 1.5px #2C5654, inset 0 0 0 3px #10302F; }
    .ph-screen { position: absolute; left: 6px; top: 6px; width: 152px; height: 322px; border-radius: 20px; overflow: hidden; background: #FDEFE0; }
    .status { position: absolute; left: 0; right: 0; top: 0; height: 11px; display: flex; align-items: center; justify-content: space-between; padding: 0 11px 0 13px; font: 700 6.4px/1 var(--font); color: #3B2A1E; }
    .status .r { display: flex; align-items: center; gap: 3px; }
    .punch { position: absolute; left: 50%; top: 3px; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: #0B1414; box-shadow: 0 0 0 1px rgba(255, 255, 255, .25); }
    .gesture { position: absolute; left: 50%; bottom: 3px; width: 46px; height: 3px; margin-left: -23px; border-radius: 3px; background: rgba(60, 40, 25, .55); }
    .key { position: absolute; right: -2.5px; width: 3px; border-radius: 0 2px 2px 0; background: #1E4A48; }

    /* Small signs drawn on the screens. */
    .ring { position: absolute; border-radius: 50%; border: 2px solid #B04E00; opacity: 0; transform: translate(-50%, -50%); }
    .ring.pulse { left: 29.9%; top: 32.9%; }
    .ring.sound { left: 50%; top: 78.2%; border-color: rgba(176, 78, 0, .55); }
    .drop-flash { position: absolute; left: 30.3%; top: 38.6%; width: 39.5%; height: 22.6%; border-radius: 6px; border: 2px solid #146B60; background: rgba(20, 107, 96, .12); opacity: 0; }
    .bar-glow { position: absolute; left: 59.7%; top: 47.4%; width: 10%; height: 6.4%; border-radius: 99px; background: radial-gradient(closest-side, rgba(255, 214, 107, .95), rgba(255, 214, 107, 0)); opacity: 0; }
    .anchor { position: absolute; width: 1px; height: 1px; }

    /* Things that travel between the devices, and the message cards. */
    .fx { position: absolute; inset: 0; }
    .trail { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .trail path { fill: none; stroke: rgba(22, 60, 59, .38); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 2 9; }
    .fly { position: absolute; left: 0; top: 0; opacity: 0; transform-origin: 50% 50%; will-change: transform, opacity; }
    .chip { display: flex; align-items: center; gap: 9px; padding: 9px 13px 9px 9px; border-radius: 14px; background: #fff; white-space: nowrap; box-shadow: 0 14px 30px -12px rgba(22, 60, 59, .45), 0 0 0 1px rgba(22, 60, 59, .06); }
    .chip img { width: 30px; height: 30px; }
    .chip b { display: block; font: 700 13px var(--serif); color: #163C3B; }
    .chip span { display: block; font: 700 10.5px var(--font); color: #B04E00; margin-top: 2px; }
    .sheet { position: relative; width: 92px; height: 116px; border-radius: 8px; background: #fff; padding: 12px 10px; box-shadow: 0 16px 30px -12px rgba(22, 60, 59, .5), 0 0 0 1px rgba(22, 60, 59, .08); }
    .sheet i { display: block; height: 4px; border-radius: 2px; background: #E2E6E4; margin-top: 6px; }
    .sheet i.t { width: 70%; height: 6px; background: #C9D3D0; margin-top: 0; }
    .tag { position: absolute; left: -8px; bottom: 14px; padding: 3px 7px; border-radius: 5px; background: #C7372F; color: #fff; font: 700 10px var(--font); letter-spacing: .04em; }
    .name { position: absolute; left: 46px; top: 122px; transform: translateX(-50%); white-space: nowrap; padding: 3px 8px; border-radius: 99px; background: rgba(255, 255, 255, .92); font: 700 11px var(--font); color: #163C3B; box-shadow: 0 4px 10px -6px rgba(0, 0, 0, .3); }
    .star img { width: 38px; height: 38px; filter: drop-shadow(0 6px 8px rgba(176, 120, 0, .35)); }

    /* The portal's own message card (its top-right message), beside the devices. */
    .note {
      position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 12px; width: max-content; max-width: 340px; opacity: 0;
      padding: 12px 18px 14px 12px; border-radius: 16px; background: #fff; overflow: hidden; transform-origin: 0 50%;
      box-shadow: 0 22px 44px -18px rgba(22, 60, 59, .45), 0 0 0 1px rgba(22, 60, 59, .06);
    }
    .note .ic { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: #146B60; }
    .note .ic.up { background: #E8A317; }
    .note strong { display: block; font: 700 14.5px/1.25 var(--font); color: #163C3B; }
    .note .d { display: block; margin-top: 2px; font: 400 12.5px/1.35 var(--font); color: #55706E; }
    .note .line { position: absolute; left: 0; bottom: 0; height: 3px; width: 0; border-radius: 0 3px 3px 0; background: #146B60; }

    /* Phones: the message card spans the top of the picture, a little smaller. */
    :host(.narrow) .note { max-width: calc(100% - 32px); width: auto; padding: 10px 14px 12px 10px; gap: 10px; }
    :host(.narrow) .note .ic { width: 30px; height: 30px; }
    :host(.narrow) .note strong { font-size: 13.5px; }
    :host(.narrow) .note .d { font-size: 12px; }
  `,
})
export class WelcomeDevices {
  readonly pos = input.required<number>();
  readonly wide = input.required<boolean>();
  readonly sw = input.required<number>();
  readonly sh = input.required<number>();
  readonly card = input.required<CardView>();
  readonly lang = input<Lang>('en');
  readonly reduced = input(false);

  readonly sunburst = SUNBURST_PATH;
  readonly laptop = LAPTOP_SCREENS.map((k) => ({ k, src: LAPTOP_SRC[k] }));
  readonly phone = PHONE_SCREENS.map((k) => ({ k, src: PHONE_SRC[k] }));
  /** The phone's thickness: thin layers stacked behind its front. */
  readonly slabs = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly notes = computed(() => [0, 1, 2].map((k) => noteText(k, this.lang())));
  readonly chip = computed(() => lessonChip(this.lang()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    let raf = 0;
    afterNextRender(() => {
      const draw = this.drawer(this.host.nativeElement);
      const tick = (now: number) => {
        draw(now / 1000);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(raf));
  }

  /** Finds the parts once, and returns the function that draws one frame at time `sec`. */
  private drawer(root: HTMLElement): (sec: number) => void {
    const q = <T extends Element = HTMLElement>(s: string) => root.querySelector(s) as unknown as T;
    const all = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
    const el = {
      glow: q('.glow'),
      burst: q('.burst'),
      rays: q<SVGPathElement>('.rays'),
      cam: q('.cam'),
      rig: q('.rig'),
      floor: q('.floor'),
      lid: q('.lid'),
      wake: q('.wake'),
      spill: q('.spill'),
      lglare: q('.lglare'),
      pglare: q('.pglare'),
      phone: q('.phone'),
      fx: q('.fx'),
      trail: q<SVGPathElement>('.trail path'),
      lesson: q('.fly.lesson'),
      pdf: q('.fly.pdf'),
      star: q('.fly.star'),
      flash: q('.drop-flash'),
      barGlow: q('.bar-glow'),
      pulses: all('.ring.pulse'),
      sounds: all('.ring.sound'),
      notes: all('.note'),
    };
    const lshots = new Map(all('.screen .shot').map((i) => [i.dataset['k'] as LaptopScreen, i]));
    const pshots = new Map(all('.ph-screen .shot').map((i) => [i.dataset['k'] as PhoneScreen, i]));
    const anchor = new Map(all('.anchor').map((a) => [a.dataset['a']!, a]));
    const at = (name: string, origin: DOMRect): Pt => {
      const r = anchor.get(name)!.getBoundingClientRect();
      return { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top };
    };
    const hide = (e: HTMLElement) => {
      e.style.opacity = '0';
      e.style.transform = 'translate(-9999px, 0)';
    };

    // Which page the devices are on, since when, and whether this is the first visit (the laptop opens).
    let page = -1;
    let arrived = 0;
    let opening = false;
    let started = false;
    // Each device remembers its last screen, so a change can fade.
    // A change within a page (the loader's steps) fades quickly; a change of page a little slower.
    const lap = { cur: 'lessons' as LaptopScreen, prev: null as LaptopScreen | null, at: 0, fade: 0.18, page: 0 };
    const ph = { cur: 'path' as PhoneScreen, prev: null as PhoneScreen | null, at: 0, fade: 0.18, page: 0 };

    return (sec: number) => {
      const reduced = this.reduced();
      const wide = this.wide();
      const pos = Math.min(PAGES.length - 1, Math.max(0, this.pos()));
      const w = this.sw();
      const h = this.sh();
      const card = this.card();
      const k = Math.round(pos);
      const frac = pos - Math.floor(pos);

      // The clock starts once the intro has gone, so nothing plays behind it.
      const intro = !started && !!document.querySelector('pl-splash');
      if (k !== page) {
        opening = page === -1 && k === 0 && !reduced;
        page = k;
        arrived = sec;
      }
      if (intro) arrived = sec;
      else started = true;
      const t = reduced ? Infinity : sec - arrived;
      const tm = opening ? t - OPENING_LEAD : t; // the page's moment, after the laptop has opened

      // ---- where the set stands
      const pose = devicePose(pos, wide, w, h, card, reduced);
      const s = pose.scale;
      const breathe = reduced ? 0 : Math.sin((sec * 2 * Math.PI) / 6);
      const lift = opening ? (1 - easeOutCubic(span(t, [0, 1.2]))) * 26 : 0;
      el.rig.style.transform = `translate3d(${pose.cx}px, ${pose.cy + lift + breathe * 2}px, 0) scale3d(${s}, ${s}, ${s}) rotateX(${pose.pitch}deg) rotateY(${pose.yaw + breathe * 0.8}deg)`;
      el.cam.style.perspectiveOrigin = `${pose.cx}px ${pose.cy - 260 * s}px`;

      // ---- light behind the devices, in the page's colour
      const i0 = Math.floor(pos);
      const i1 = Math.min(PAGES.length - 1, i0 + 1);
      const gcol = mix(PAGES[i0].glow, PAGES[i1].glow, frac);
      const fade = (a: number) => gcol.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
      const gx = wide ? pose.cx + (105 * s + 22) * pose.side : w / 2;
      const gy = pose.cy - 230 * s;
      const gs = 640 * s;
      el.glow.style.cssText = `left:${gx - gs / 2}px;top:${gy - gs / 2}px;width:${gs}px;height:${gs}px;background:radial-gradient(circle, ${gcol} 0%, ${fade(0.55)} 55%, ${fade(0)} 100%)`;
      const bs = 760 * s;
      el.burst.style.cssText = `left:${gx - bs / 2}px;top:${gy - bs / 2}px;width:${bs}px;height:${bs}px`;
      el.rays.setAttribute('transform', `rotate(${reduced ? 0 : ((sec * 4) % 360).toFixed(2)} 50 50)`);

      // ---- laptop: opens on the first visit
      const lidAngle = opening ? lerp(-89, 14, easeOutBack(span(t, OPENING.lid), 0.9)) : 14;
      el.lid.style.transform = `rotateX(${lidAngle}deg)`;
      const wake = opening ? easeOutCubic(span(t, OPENING.wake)) : 1;
      el.wake.style.opacity = String(1 - wake);
      el.spill.style.opacity = String(0.25 + 0.75 * wake);
      el.lglare.style.backgroundPosition = `${50 + pose.yaw * 2.2 + breathe * 3}% 0`;

      // ---- phone: beside the laptop, a little in front; rises in on the first visit
      const phoneIn = opening ? easeOutCubic(span(t, OPENING.phone)) : 1;
      const float = reduced ? 16 : 16 + Math.sin((sec * 2 * Math.PI) / 4.2 + 1) * 4;
      const P = pose.phone;
      el.phone.style.transform = `translate3d(${P.x}px, ${13 - 334 - float + (1 - phoneIn) * 70}px, ${P.z}px) rotateY(${P.yaw}deg) rotateX(${(1 - phoneIn) * 14}deg) scale3d(${P.scale}, ${P.scale}, ${P.scale})`;
      el.phone.style.opacity = phoneIn < 1 ? String(phoneIn) : '';
      el.pglare.style.backgroundPosition = `${50 + (pose.yaw + P.yaw) * 2.5}% 0`;

      // ---- the floor: a pool of light and the two soft shadows
      const shX = 50 + (P.x / 1040) * 100;
      el.floor.style.transform = 'translate3d(0, 13px, -150px) rotateX(90deg)';
      el.floor.style.background = [
        `radial-gradient(9% 5.5% at ${shX}% ${((P.z + 150) / 720) * 100}%, rgba(12,36,35,${(0.34 * phoneIn) / (1 + float / 60)}), rgba(12,36,35,0) 100%)`,
        `radial-gradient(32% 30% at 50% ${(330 / 720) * 100}%, rgba(12,36,35,.30), rgba(12,36,35,0) 100%)`,
        'radial-gradient(50% 50% at 50% 46%, rgba(255,255,255,.55), rgba(255,255,255,0) 100%)',
      ].join(',');

      // ---- screens: the page's screen for this moment; a change fades (between pages, around halfway)
      const wantL = laptopScreen(k, tm);
      if (wantL !== lap.cur) Object.assign(lap, { prev: lap.cur, cur: wantL, at: sec, fade: k === lap.page ? 0.18 : 0.24, page: k });
      const lw = screenWeights(LAPTOP_SCREENS, lap.cur, lap.prev, reduced ? Infinity : sec - lap.at, lap.fade);
      for (const [key, img] of lshots) img.style.opacity = String(lw[key]);
      const wantP = phoneScreen(k, tm);
      if (wantP !== ph.cur) Object.assign(ph, { prev: ph.cur, cur: wantP, at: sec, fade: k === ph.page ? 0.35 : 0.24, page: k });
      const pw = screenWeights(PHONE_SCREENS, ph.cur, ph.prev, reduced ? Infinity : sec - ph.at, ph.fade);
      for (const [key, img] of pshots) {
        img.style.opacity = String(pw[key]);
        // The child's lesson slides up over the path.
        img.style.transform = key === 'lesson' && ph.prev === 'path' && !reduced && sec - ph.at < 0.45 ? `translateY(${(1 - easeOutCubic(clamp((sec - ph.at) / 0.4))) * 40}%)` : '';
      }

      // ---- the page's moment
      const fx = el.fx.getBoundingClientRect();
      const settled = 1 - clamp(Math.abs(pos - k) * 8); // moments and notes give way as soon as the page moves

      // Page 1: the lesson lifts off the laptop and lands on the child's path.
      const m1 = MOMENTS.pocket;
      const f1 = span(tm, m1.fly);
      if (k === 0 && !reduced && settled > 0 && tm >= m1.fly[0] && tm < m1.fly[1] + 0.5) {
        const a = at('unit', fx);
        const b = at('node', fx);
        const c = { x: (a.x + b.x) / 2 + 40 * pose.side, y: Math.min(a.y, b.y) - 170 * s };
        const e = easeInOutCubic(f1);
        const p = curve(a, c, b, e);
        const sc = f1 < 0.25 ? lerp(0.55, 1, easeOutCubic(f1 / 0.25)) : lerp(1, 0.28, easeInCubic(clamp((f1 - 0.55) / 0.45)));
        const r = (el.lesson.firstElementChild as HTMLElement).getBoundingClientRect();
        el.lesson.style.opacity = String((f1 < 0.08 ? f1 / 0.08 : f1 > 0.92 ? (1 - f1) / 0.08 : 1) * settled);
        el.lesson.style.transform = `translate(${p.x - r.width / 2}px, ${p.y - r.height / 2}px) scale(${sc}) rotate(${Math.sin(e * Math.PI) * -4 * pose.side}deg)`;
        let d = `M${a.x.toFixed(1)},${a.y.toFixed(1)}`;
        for (let i = 1; i <= 28; i++) {
          const pt = curve(a, c, b, (i / 28) * e);
          d += ` L${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        }
        el.trail.setAttribute('d', d);
        el.trail.style.opacity = String((tm > m1.fly[1] ? 1 - clamp((tm - m1.fly[1]) / 0.5) : 0.9) * settled);
      } else {
        hide(el.lesson);
        el.trail.setAttribute('d', '');
      }
      el.pulses.forEach((ring, i) => {
        const e = clamp((span(tm, m1.pulse) - i * 0.22) / 0.75);
        const on = k === 0 && !reduced && tm > m1.pulse[0] + i * 0.18 && e < 1;
        ring.style.opacity = on ? String((1 - e) * settled) : '0';
        const size = `${(0.224 + e * 0.32) * 152}px`;
        ring.style.width = ring.style.height = size;
      });

      // Page 2: a PDF drops into the upload pop-up; the lesson is read, made, and plays on the phone.
      const m2 = MOMENTS.make;
      const fp = span(tm, m2.drop);
      if (k === 1 && !reduced && settled > 0 && tm >= m2.drop[0] && tm < m2.drop[1]) {
        const b = at('drop', fx);
        const a = { x: b.x - 250 * s * pose.side, y: b.y - 260 * s };
        const c = { x: lerp(a.x, b.x, 0.25), y: a.y - 60 * s };
        const e = easeInOutCubic(fp);
        const p = curve(a, c, b, e);
        el.pdf.style.opacity = String((fp < 0.12 ? fp / 0.12 : fp > 0.85 ? (1 - fp) / 0.15 : 1) * settled);
        el.pdf.style.transform = `translate(${p.x - 46}px, ${p.y - 58}px) scale(${lerp(1, 0.42, easeInCubic(fp)) * (wide ? 1 : 0.8)}) rotate(${lerp(-10 * pose.side, 0, e)}deg)`;
      } else hide(el.pdf);
      el.flash.style.opacity = k === 1 && !reduced && tm >= m2.flash[0] && tm < m2.reading ? String(Math.sin(Math.PI * span(tm, m2.flash))) : '0';
      el.sounds.forEach((ring, i) => {
        const e = (((tm - m2.sound) / 1.2) * 2.2 + i * 0.5) % 1;
        const on = k === 1 && !reduced && tm >= m2.sound;
        ring.style.opacity = on ? String((1 - e) * 0.9 * settled) : '0';
        const size = `${(0.21 + e * 0.2) * 152}px`;
        ring.style.width = ring.style.height = size;
      });

      // Page 3: a star leaves the child's medal and lights up the center's bar on the admin overview.
      const m3 = MOMENTS.shine;
      const fs = span(tm, m3.star);
      if (k === 2 && !reduced && settled > 0 && tm >= m3.star[0] && tm < m3.star[1]) {
        const a = at('medal', fx);
        const b = at('bar', fx);
        const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 190 * s };
        const e = easeInOutCubic(fs);
        const p = curve(a, c, b, e);
        el.star.style.opacity = String((fs < 0.1 ? fs / 0.1 : fs > 0.9 ? (1 - fs) / 0.1 : 1) * settled);
        el.star.style.transform = `translate(${p.x - 19}px, ${p.y - 19}px) scale(${lerp(0.6, 1.15, Math.sin(Math.PI * e)) * (wide ? 1 : 0.75)}) rotate(${e * 300}deg)`;
      } else hide(el.star);
      const g3 = span(tm, m3.glow);
      el.barGlow.style.opacity =
        k === 2 && tm >= m3.glow[0] ? String(reduced ? 0.35 : g3 < 1 ? Math.sin(Math.PI * g3) * 0.9 + 0.1 * g3 : 0.35 + 0.15 * Math.sin(sec * 5)) : '0';

      // ---- the message card of this page, beside the devices (above them on phones)
      const artMin = card.x > 0 ? 16 : card.width + 60;
      const artMax = card.x > 0 ? card.x - 60 : w - 16;
      el.notes.forEach((n, i) => {
        const shown = i === k ? clamp((tm - noteAt(i)) / 0.45) * settled : 0;
        if (shown <= 0) return hide(n);
        let x = 16;
        let y = 12;
        if (wide) {
          // Page 1 above the phone, where the lesson landed; page 2 by the laptop's top-right corner, where the
          // portal shows its own message; page 3 over the laptop's top-left, beside the chart the star lit up.
          const a = at(i === 0 ? 'ptl' : i === 1 ? 'ltr' : 'ltl', fx);
          x = a.x + (i === 0 ? -40 : i === 1 ? -230 : -10);
          y = a.y - (i === 0 ? 104 : 96);
          x = Math.min(Math.max(x, artMin), artMax - n.offsetWidth);
        }
        n.style.opacity = String(clamp(shown * 1.6));
        n.style.transform = `translate(${x}px, ${y + (1 - easeOutCubic(shown)) * 10}px) scale(${0.9 + 0.1 * easeOutBack(shown, 1.6)})`;
        (n.lastElementChild as HTMLElement).style.width = `${(1 - clamp((tm - noteAt(i)) / 4.5)) * 100}%`;
      });
    };
  }
}

