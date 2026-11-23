import { Component, input } from '@angular/core';
import { SUNBURST_PATH } from '../pages/welcome/welcome-motion';
import { BrandLaptops } from './brand-laptops';
import { Logo } from './logo';

/**
 * The left panel of sign-in and setup, in the welcome pages' look: the soft mint page with its glow and slowly
 * turning sunburst, two laptops trading places on a ring (the administrator's overview and the teacher's
 * dashboard), and a few small pictures drifting.
 */
@Component({
  selector: 'pl-brand-panel',
  imports: [Logo, BrandLaptops],
  template: `
    <div class="panel" aria-hidden="true">
      <pl-logo variant="full" [height]="60" />
      <div class="art">
        <div class="glow"></div>
        <svg class="burst" viewBox="0 0 100 100"><path [attr.d]="sunburst" fill="#fff" /></svg>
        <img class="f f1" src="icons3d/school.webp" alt="" />
        <img class="f f2" src="icons3d/star.webp" alt="" />
        <img class="f f3" src="icons3d/sparkles.webp" alt="" />
        <img class="f f4" src="icons3d/pencil.webp" alt="" />
        <pl-brand-laptops [front]="front()" [face]="face()" />
      </div>
      <!-- New words rise in when they change (sign-in and join say different things). -->
      @for (q of [quote()]; track q) {
        <div class="words">
          <p class="big">{{ q }}</p>
          <p class="sub">{{ sub() }}</p>
        </div>
      }
      <p class="credit">AHA Learning Center × UpUp Technologies</p>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .panel {
      position: relative; min-height: 100%; display: flex; flex-direction: column; justify-content: space-between; gap: 18px;
      padding: 28px 40px; overflow: hidden; color: #163C3B; background: linear-gradient(180deg, #9FDDB4, #E1F1DD);
    }
    .art { position: relative; flex: 1; min-height: 260px; display: grid; place-items: center; }
    .glow { position: absolute; width: min(460px, 92%); aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, #E9F8EA 0%, #E9F8EA8c 55%, #E9F8EA00 100%); }
    .burst { position: absolute; width: min(420px, 86%); aspect-ratio: 1; opacity: .35; animation: turn 32s linear infinite; }
    .f { position: absolute; animation: drift 6s ease-in-out infinite; }
    .f1 { width: 64px; left: 12%; top: 10%; animation-delay: -1s; }
    .f2 { width: 42px; right: 16%; top: 16%; animation-delay: -2.5s; }
    .f3 { width: 36px; left: 22%; bottom: 14%; animation-delay: -3.5s; }
    .f4 { width: 54px; right: 12%; bottom: 20%; animation-delay: -4.5s; }
    .big { font-family: var(--serif); font-weight: 700; font-size: clamp(26px, 2.6vw, 36px); line-height: 1.18; color: #163C3B; text-wrap: balance; }
    .sub { margin-top: 10px; color: #2B4A47; }
    .credit { font-size: 13px; color: #3F5E59; }
    .words { animation: words-in .5s cubic-bezier(.16, 1, .3, 1) both; }
    @keyframes words-in { from { opacity: 0; transform: translateY(12px); } }
    @keyframes drift { 0%, 100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-12px) rotate(6deg); } }
    @keyframes turn { to { transform: rotate(360deg); } }
    @media (max-width: 860px) {
      .panel { padding: 18px 20px; }
      .art { display: none; }
      .big { font-size: 24px; }
    }
    @media (prefers-reduced-motion: reduce) { .burst, .f, .words { animation: none; } }
  `,
})
export class BrandPanel {
  readonly quote = input.required<string>();
  readonly sub = input('');
  /** Passed to the laptops: the one to keep in front, and which way to turn (towards the form). */
  readonly front = input<'teacher' | 'admin' | null>(null);
  readonly face = input(0);
  readonly sunburst = SUNBURST_PATH;
}
