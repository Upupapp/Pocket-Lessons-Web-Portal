import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let next = 0;

/**
 * A soft green "essence" behind a page area: a pale mint wash with translucent waves in three corners
 * (top right, bottom left, bottom right) that fade towards the middle, so the centre stays calm and readable.
 * Decorative and still. Colours come from the --bg-wave-* tokens in styles.scss.
 *
 * Put it first inside the area, give the area's other children `position: relative; z-index: 1`.
 * `fixed`: it stays put while long pages scroll (the portal's content area; set --wave-left and --wave-top
 * on it to keep clear of the sidebar and header). Otherwise it fills its nearest positioned parent.
 * `wash`: also paint the mint wash (off when the parent paints its own background).
 */
@Component({
  selector: 'pl-wave-bg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class.fixed]': 'fixed()', '[class.wash]': 'wash()' },
  template: `
    <!-- Top right -->
    <svg class="w tr" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMin meet" focusable="false">
      <defs>
        <linearGradient [attr.id]="id + 'a'" x1="1" y1="0" x2="0.25" y2="0.9">
          <stop offset="0" style="stop-color: var(--bg-wave-1); stop-opacity: var(--bg-wave-o1)" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-1); stop-opacity: 0" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'b'" x1="1" y1="0" x2="0.2" y2="1">
          <stop offset="0" style="stop-color: var(--bg-wave-2); stop-opacity: var(--bg-wave-o2)" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-2); stop-opacity: 0" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'l'" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--bg-wave-4); stop-opacity: var(--bg-wave-o-line)" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-1); stop-opacity: 0" />
        </linearGradient>
      </defs>
      <path [attr.fill]="'url(#' + id + 'a)'" d="M600,0 H150 C214,34 286,46 362,62 C452,80 506,124 546,200 C572,248 588,300 600,352 Z" />
      <path [attr.fill]="'url(#' + id + 'b)'" d="M600,0 H300 C352,26 402,36 452,48 C520,64 560,106 600,178 Z" />
      <path [attr.stroke]="'url(#' + id + 'l)'" fill="none" stroke-width="1.6" d="M206,0 C272,40 348,56 418,74 C494,94 538,142 570,208 C586,242 595,276 600,306" />
    </svg>

    <!-- Bottom left: the same waves turned round -->
    <svg class="w bl" viewBox="0 0 600 400" preserveAspectRatio="xMinYMax meet" focusable="false">
      <defs>
        <linearGradient [attr.id]="id + 'c'" x1="1" y1="0" x2="0.25" y2="0.9">
          <stop offset="0" style="stop-color: var(--bg-wave-3); stop-opacity: var(--bg-wave-o3)" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-1); stop-opacity: 0" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'd'" x1="1" y1="0" x2="0.2" y2="1">
          <stop offset="0" style="stop-color: var(--bg-wave-4); stop-opacity: var(--bg-wave-o2)" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-2); stop-opacity: 0" />
        </linearGradient>
      </defs>
      <g transform="rotate(180 300 200)">
        <path [attr.fill]="'url(#' + id + 'c)'" d="M600,0 H170 C232,30 300,44 372,60 C458,80 510,120 548,192 C572,238 588,290 600,340 Z" />
        <path [attr.fill]="'url(#' + id + 'd)'" d="M600,0 H320 C366,24 412,34 458,46 C522,62 562,100 600,168 Z" />
        <path [attr.stroke]="'url(#' + id + 'l)'" fill="none" stroke-width="1.6" d="M228,0 C290,36 360,52 428,70 C500,90 544,136 574,198 C590,232 596,262 600,290" />
      </g>
    </svg>

    <!-- Bottom right: the same waves mirrored upwards -->
    <svg class="w br" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMax meet" focusable="false">
      <defs>
        <linearGradient [attr.id]="id + 'e'" x1="1" y1="0" x2="0.25" y2="0.9">
          <stop offset="0" style="stop-color: var(--bg-wave-2); stop-opacity: var(--bg-wave-o4)" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-2); stop-opacity: 0" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'f'" x1="1" y1="0" x2="0.2" y2="1">
          <stop offset="0" style="stop-color: var(--bg-wave-1); stop-opacity: 0.8" />
          <stop offset="1" style="stop-color: var(--bg-wave-fade-1); stop-opacity: 0" />
        </linearGradient>
      </defs>
      <g transform="translate(0 400) scale(1 -1)">
        <path [attr.fill]="'url(#' + id + 'e)'" d="M600,0 H190 C250,32 316,46 386,62 C466,80 514,122 550,190 C574,236 590,286 600,334 Z" />
        <path [attr.fill]="'url(#' + id + 'f)'" d="M600,0 H372 C412,22 452,32 494,42 C548,56 578,92 600,150 Z" />
        <path [attr.stroke]="'url(#' + id + 'l)'" fill="none" stroke-width="1.6" d="M246,0 C306,38 374,54 440,72 C508,92 550,138 578,200 C592,232 597,262 600,288" />
      </g>
    </svg>
  `,
  styles: `
    :host {
      position: absolute; inset: 0; z-index: 0; display: block; overflow: hidden; pointer-events: none;
      container-type: size; --wave-scale: 1;
    }
    /* The portal's content area: it stays put while the page scrolls under it. */
    :host(.fixed) { position: fixed; inset: auto; left: var(--wave-left, 0px); top: var(--wave-top, 0px); right: 0; bottom: 0; }
    :host(.wash) { background: var(--bg-wave-base); }
    .w { position: absolute; display: block; height: auto; overflow: visible; }
    /* Sized by the area they decorate, so they grow and shrink with the screen. */
    .tr { top: 0; right: 0; width: clamp(calc(170px * var(--wave-scale)), calc(46cqw * var(--wave-scale)), 660px); }
    .bl { bottom: 0; left: 0; width: clamp(calc(150px * var(--wave-scale)), calc(38cqw * var(--wave-scale)), 540px); }
    .br { bottom: 0; right: 0; width: clamp(calc(140px * var(--wave-scale)), calc(34cqw * var(--wave-scale)), 500px); }
    /* Phones: about 40% smaller, kept to the corners. */
    @media (max-width: 640px) { :host { --wave-scale: 0.6; } }
    /* The waves never move; nothing to calm down, but nothing may animate either. */
    @media (prefers-reduced-motion: reduce) { .w { animation: none; transition: none; } }
    @media print { :host { display: none; } }
  `,
})
export class WaveBg {
  readonly fixed = input(false);
  readonly wash = input(true);
  /** Each copy names its own gradients, so two on a page never share them. */
  readonly id = `pl-wave-${++next}-`;
}
