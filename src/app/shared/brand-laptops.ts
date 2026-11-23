import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { Laptop3d } from './laptop-3d';
import { laptopAngle, seatAt } from './laptop-orbit';

/**
 * The sign-in panel's picture: two laptops on a glowing ring, one with the teacher's dashboard and one with the
 * administrator's overview (the real portal, sample data). One faces the viewer at the front for 3 seconds while
 * the other waits behind; then they trade places round the ring. Decorative.
 */
@Component({
  selector: 'pl-brand-laptops',
  imports: [Laptop3d],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="cam">
      <div class="rig">
        <div class="ring"></div>
        @for (l of laptops; track l.k) {
          <div class="seat" [attr.data-k]="l.k">
            <div class="shadow"></div>
            <pl-laptop-3d>
              <img class="shot" [src]="l.src" alt="" decoding="async" draggable="false" />
              <div class="glare"></div>
            </pl-laptop-3d>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { position: absolute; inset: 0; display: block; pointer-events: none; }
    .cam { position: absolute; inset: 0; perspective: 1700px; }
    .rig { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; will-change: transform; }
    .seat { position: absolute; left: 0; top: 0; transform-style: preserve-3d; }
    /* The ring on the floor: a soft pool with a bright edge, wider than deep. */
    .ring {
      position: absolute; left: -680px; top: -430px; width: 1360px; height: 860px; transform: translateY(14px) rotateX(90deg); backface-visibility: hidden;
      background:
        radial-gradient(closest-side, rgba(20, 107, 96, 0) 0 86%, rgba(20, 107, 96, .16) 90%, rgba(255, 255, 255, .95) 93.5%, rgba(20, 107, 96, .22) 96.5%, rgba(20, 107, 96, 0) 100%),
        radial-gradient(closest-side, rgba(255, 255, 255, .42), rgba(255, 255, 255, 0) 78%);
    }
    /* Each laptop turns round its own middle (its hinge sits 180 units behind it), with its shadow under it. */
    .seat pl-laptop-3d { transform: translateZ(-180px); }
    .shadow {
      position: absolute; left: -330px; top: -230px; width: 660px; height: 460px; transform: translateY(13px) rotateX(90deg); backface-visibility: hidden;
      background: radial-gradient(closest-side, rgba(12, 36, 35, .30), rgba(12, 36, 35, 0));
    }
    .shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; user-select: none; }
    .glare { position: absolute; inset: 0; background: linear-gradient(118deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, .12) 44%, rgba(255, 255, 255, 0) 58%); background-size: 260% 100%; }
  `,
})
export class BrandLaptops {
  /** The teacher's dashboard comes to the front first; the administrator's overview waits behind it. */
  readonly laptops = [
    { k: 'teacher', src: 'welcome/teacher-dashboard.webp' },
    { k: 'admin', src: 'welcome/admin-overview.webp' },
  ];

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    let raf = 0;
    afterNextRender(() => {
      const root = this.host.nativeElement;
      const rig = root.querySelector<HTMLElement>('.rig')!;
      const cam = root.querySelector<HTMLElement>('.cam')!;
      const seats = [...root.querySelectorAll<HTMLElement>('.seat')];
      const glares = [...root.querySelectorAll<HTMLElement>('.glare')];
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let start = performance.now();
      const tick = (now: number) => {
        // The first dashboard gets its full 3 s once it can be seen: after the intro, and after the welcome
        // pages' window has finished opening onto this page.
        if (document.documentElement.dataset['wt'] || document.querySelector('pl-splash')) start = now;
        const w = root.clientWidth;
        const h = root.clientHeight;
        if (w > 0 && h > 0) {
          // The pair is about 1170 units wide while swapping and 720 tall with the one behind: fit the picture area.
          const s = Math.min(w / 1170, h / 720, 0.62);
          const cx = w / 2;
          const cy = h * 0.6;
          rig.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale3d(${s}, ${s}, ${s}) rotateX(-16deg)`;
          cam.style.perspectiveOrigin = `${cx}px ${cy - 300 * s}px`;
          const t = (now - start) / 1000;
          seats.forEach((seat, i) => {
            const p = seatAt(laptopAngle(i, t, reduced));
            seat.style.transform = `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateY(${p.yaw}deg) scale3d(${p.scale}, ${p.scale}, ${p.scale})`;
            glares[i].style.backgroundPosition = `${50 + p.yaw * 2.2}% 0`;
          });
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(raf));
  }
}
