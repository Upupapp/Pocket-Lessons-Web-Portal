import { Component, input } from '@angular/core';

/**
 * The Pocket Lessons logo (Combined v2), the same artwork as the mobile app.
 * - `mark` (default): the logo icon with the name beside it, for sidebars and headers.
 * - `full`: the whole logo with "Tuloy Ang Aral", for sign-in, welcome and setup pages.
 * `light` = for dark backgrounds.
 */
@Component({
  selector: 'pl-logo',
  template: `
    @if (variant() === 'full') {
      <img
        class="full"
        [src]="light() ? 'brand/logo-full-light.svg' : 'brand/logo-full.svg'"
        [style.height.px]="height()"
        alt="Pocket Lessons – Tuloy Ang Aral"
      />
    } @else {
      <span class="logo" [class.light]="light()">
        <img class="icon" src="brand/logo-icon.svg" alt="" width="34" height="38" />
        <span class="word">Pocket <span class="second">Lessons</span></span>
      </span>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .full { display: block; width: auto; max-width: 100%; }
    .logo { display: inline-flex; align-items: center; gap: 9px; }
    .icon { display: block; width: 34px; height: 38px; }
    .word { font-family: var(--serif); font-weight: 700; font-size: 19px; color: var(--ink); letter-spacing: -.01em; white-space: nowrap; }
    .second { color: var(--teal); }
    .light .word { color: #FFF9ED; }
    .light .second { color: #F6CC59; }
  `,
})
export class Logo {
  readonly light = input(false);
  readonly variant = input<'mark' | 'full'>('mark');
  /** Height of the full logo in px. */
  readonly height = input(56);
}
