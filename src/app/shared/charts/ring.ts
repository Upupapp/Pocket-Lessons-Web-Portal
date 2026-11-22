import { Component, computed, input } from '@angular/core';
import { CHART, CHART_STYLES, pct } from './chart-kit';

/** One ratio against its whole, drawn as a ring (e.g. learners checked in the last 30 days). */
@Component({
  selector: 'pl-ring',
  template: `
    <figure class="chart">
      <figcaption class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (caption()) { <p class="cap">{{ caption() }}</p> }
        </div>
      </figcaption>
      <div class="body">
        <svg viewBox="0 0 168 168" width="168" height="168" role="img" [attr.aria-label]="label()">
          <circle cx="84" cy="84" [attr.r]="r" fill="none" [attr.stroke]="c.track" [attr.stroke-width]="stroke" />
          @if (share() > 0) {
            <circle
              class="arc"
              cx="84"
              cy="84"
              [attr.r]="r"
              fill="none"
              [attr.stroke]="color()"
              [attr.stroke-width]="stroke"
              stroke-linecap="round"
              [attr.stroke-dasharray]="dash()"
              transform="rotate(-90 84 84)"
            />
          }
          <text x="84" y="84" text-anchor="middle" class="big">{{ share() }}%</text>
          <text x="84" y="106" text-anchor="middle" class="small">{{ value() }} of {{ total() }}</text>
        </svg>
        <div class="side"><ng-content /></div>
      </div>
    </figure>
  `,
  styles: [
    CHART_STYLES,
    `
      .body { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      svg { width: 168px; flex: none; }
      .big { font: 600 30px var(--font); fill: var(--ink); }
      .small { font: 13px var(--font); fill: var(--muted); }
      .arc { transition: stroke-dasharray .6s cubic-bezier(.2, .8, .2, 1); }
      .side { flex: 1 1 160px; min-width: 0; display: grid; gap: 8px; font-size: 13.5px; color: var(--ink-2); }
    `,
  ],
})
export class RingMeter {
  readonly title = input.required<string>();
  readonly caption = input('');
  readonly value = input.required<number>();
  readonly total = input.required<number>();
  /** What is being counted, for the accessible name: "learners checked in the last 30 days". */
  readonly what = input('');
  readonly color = input<string>(CHART.accent);

  readonly c = CHART;
  readonly r = 66;
  readonly stroke = 14;
  readonly share = computed(() => pct(this.value(), this.total()));
  readonly dash = computed(() => {
    const circ = 2 * Math.PI * this.r;
    const len = Math.max(0, Math.min(1, this.total() ? this.value() / this.total() : 0)) * circ;
    return `${len} ${circ}`;
  });
  readonly label = computed(() => `${this.value()} of ${this.total()} ${this.what()} (${this.share()}%)`.trim());
}
