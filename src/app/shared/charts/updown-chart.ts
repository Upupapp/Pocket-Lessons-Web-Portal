import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { CHART, CHART_STYLES, labelEvery } from './chart-kit';

export interface UpDownWeek {
  label: string;
  long: string;
  up: number;
  down: number;
}

const PAD = { l: 26, r: 8, t: 10, b: 26 };

/** Level moves per week: moves up rise above the line, moves down hang below it. */
@Component({
  selector: 'pl-updown-chart',
  template: `
    <figure class="chart">
      <figcaption class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (caption()) { <p class="cap">{{ caption() }}</p> }
        </div>
        <div class="tools">
          @if (total() > 0) {
            <button type="button" class="tbl" (click)="table.set(!table())" [attr.aria-pressed]="table()">{{ table() ? 'Chart' : 'Table' }}</button>
          }
        </div>
      </figcaption>

      <ul class="legend">
        <li>
          <svg class="arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 9.5H1z" [attr.fill]="c.up" /></svg>
          Moved up <strong>{{ ups() }}</strong>
        </li>
        <li>
          <svg class="arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.5 1 2.5h10z" [attr.fill]="c.down" /></svg>
          Moved down <strong>{{ downs() }}</strong>
        </li>
      </ul>

      @if (total() === 0) {
        <p class="none">{{ empty() }}</p>
      } @else if (table()) {
        <div class="scroll">
          <table class="data">
            <thead><tr><th>Week</th><th class="n">Moved up</th><th class="n">Moved down</th></tr></thead>
            <tbody>
              @for (wk of weeks(); track $index) {
                <tr><td>{{ wk.long }}</td><td class="n">{{ wk.up }}</td><td class="n">{{ wk.down }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="plot">
          <svg
            [attr.viewBox]="'0 0 ' + w() + ' ' + height()"
            [attr.height]="height()"
            role="img"
            [attr.aria-label]="summary()"
            tabindex="0"
            (pointerleave)="hover.set(-1)"
            (focus)="hover.set(lastWithMoves())"
            (blur)="hover.set(-1)"
            (keydown)="key($event)"
          >
            @for (t of ticks(); track t) {
              <line [attr.x1]="pad.l" [attr.x2]="w() - pad.r" [attr.y1]="y(t)" [attr.y2]="y(t)" [attr.stroke]="t === 0 ? c.axis : c.grid" stroke-width="1" />
              <text class="tick" [attr.x]="pad.l - 7" [attr.y]="y(t) + 4" text-anchor="end">{{ t < 0 ? -t : t }}</text>
            }
            @for (wk of weeks(); track $index) {
              @if (labels().has($index)) {
                <text class="tick" [attr.x]="cx($index)" [attr.y]="height() - 6" [attr.text-anchor]="$index === weeks().length - 1 ? 'end' : 'middle'">{{ wk.label }}</text>
              }
              <g [class.dim]="hover() >= 0 && hover() !== $index">
                @if (wk.up) { <path [attr.d]="bar($index, wk.up, 1)" [attr.fill]="c.up" /> }
                @if (wk.down) { <path [attr.d]="bar($index, wk.down, -1)" [attr.fill]="c.down" /> }
              </g>
              <rect class="hit" [attr.x]="cx($index) - band() / 2" [attr.y]="pad.t" [attr.width]="band()" [attr.height]="height() - pad.t - pad.b" (pointerenter)="hover.set($index)" />
            }
          </svg>
          @if (hover() >= 0) {
            <div class="tip side" [class.flip]="tipFlip()" [style.left.px]="tipX()" aria-hidden="true">
              <div class="row"><span class="key" [style.background]="c.up"></span><strong>{{ weeks()[hover()].up }}</strong>&nbsp;moved up</div>
              <div class="row"><span class="key" [style.background]="c.down"></span><strong>{{ weeks()[hover()].down }}</strong>&nbsp;moved down</div>
              {{ weeks()[hover()].long }}
            </div>
          }
          <p class="sr" aria-live="polite">{{ spoken() }}</p>
        </div>
      }
    </figure>
  `,
  styles: [
    CHART_STYLES,
    `
      .legend strong { font-variant-numeric: tabular-nums; color: var(--ink); }
      .arrow { flex: none; }
      .hit { fill: transparent; cursor: default; }
      g { transition: opacity .15s; }
      g.dim { opacity: .35; }
      .tip .row strong { display: inline; font-size: 14px; }
      .tip .row { white-space: nowrap; }
      .tip.side { top: 12px; transform: none; }
      .tip.side.flip { transform: translateX(-100%); }
    `,
  ],
})
export class UpDownChart {
  readonly title = input.required<string>();
  readonly caption = input('');
  readonly weeks = input.required<UpDownWeek[]>();
  readonly height = input(190);
  readonly empty = input('No level changes recorded yet.');

  readonly c = CHART;
  readonly pad = PAD;
  readonly table = signal(false);
  readonly hover = signal(-1);
  readonly w = signal(560);

  readonly ups = computed(() => this.weeks().reduce((s, w) => s + w.up, 0));
  readonly downs = computed(() => this.weeks().reduce((s, w) => s + w.down, 0));
  readonly total = computed(() => this.ups() + this.downs());
  readonly top = computed(() => Math.max(2, ...this.weeks().map((w) => w.up), ...this.weeks().map((w) => w.down)));
  readonly ticks = computed(() => {
    const t = this.top();
    const step = t <= 4 ? 1 : Math.ceil(t / 4);
    const out: number[] = [];
    for (let v = -Math.ceil(t / step) * step; v <= t; v += step) out.push(v);
    return out;
  });
  readonly span = computed(() => Math.max(...this.ticks().map(Math.abs)));
  readonly band = computed(() => (this.w() - PAD.l - PAD.r) / Math.max(1, this.weeks().length));
  readonly labels = computed(() => labelEvery(this.weeks().length, Math.max(2, Math.floor(this.w() / 86))));
  readonly lastWithMoves = computed(() => {
    const ws = this.weeks();
    for (let i = ws.length - 1; i >= 0; i--) if (ws[i].up || ws[i].down) return i;
    return ws.length - 1;
  });
  /** The tooltip sits beside the hovered week: to its right, or to its left in the right half of the chart. */
  readonly tipFlip = computed(() => this.cx(Math.max(0, this.hover())) > this.w() / 2);
  readonly tipX = computed(() => this.cx(Math.max(0, this.hover())) + (this.tipFlip() ? -1 : 1) * (this.band() / 2 + 4));
  readonly spoken = computed(() => {
    const w = this.weeks()[this.hover()];
    return w ? `${w.long}: ${w.up} moved up, ${w.down} moved down` : '';
  });
  readonly summary = computed(
    () =>
      `${this.title()}. ${this.ups()} moved up and ${this.downs()} moved down over ${this.weeks().length} weeks. Use the left and right arrow keys to read each week, or open the table.`,
  );

  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const el = host.nativeElement as HTMLElement;
      const set = () => this.w.set(Math.max(260, Math.round(el.clientWidth)));
      set();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(set);
      ro.observe(el);
      destroy.onDestroy(() => ro.disconnect());
    });
  }

  cx(i: number): number {
    return PAD.l + this.band() * (i + 0.5);
  }

  y(v: number): number {
    const s = this.span() || 1;
    return PAD.t + ((s - v) / (2 * s)) * (this.height() - PAD.t - PAD.b);
  }

  /** A column from the zero line: 4px rounded at its free end, square at the line. */
  bar(i: number, n: number, dir: 1 | -1): string {
    const bw = Math.min(22, this.band() * 0.56);
    const x0 = this.cx(i) - bw / 2;
    const x1 = x0 + bw;
    const base = this.y(0) + (dir === 1 ? -1 : 1); // 1px air off the axis line
    const tip = this.y(dir * n);
    const r = Math.min(4, Math.abs(base - tip) / 2, bw / 2);
    if (dir === 1) {
      return `M${x0},${base}V${tip + r}Q${x0},${tip} ${x0 + r},${tip}H${x1 - r}Q${x1},${tip} ${x1},${tip + r}V${base}Z`;
    }
    return `M${x0},${base}V${tip - r}Q${x0},${tip} ${x0 + r},${tip}H${x1 - r}Q${x1},${tip} ${x1},${tip - r}V${base}Z`;
  }

  key(e: KeyboardEvent): void {
    const n = this.weeks().length;
    const at = this.hover() < 0 ? this.lastWithMoves() : this.hover();
    const next = e.key === 'ArrowLeft' ? at - 1 : e.key === 'ArrowRight' ? at + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (e.key === 'Escape') return this.hover.set(-1);
    if (next === null) return;
    e.preventDefault();
    this.hover.set(Math.min(n - 1, Math.max(0, next)));
  }
}
